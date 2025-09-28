# HaloBuzz Northflank Deployment Script (PowerShell)
# This script helps automate the deployment process

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("build", "check", "deploy", "health", "cleanup")]
    [string]$Action = "deploy"
)

# Configuration
$PROJECT_NAME = "halobuzz"
$BACKEND_SERVICE = "halo-api"
$AI_SERVICE = "halo-ai-engine"
$ADMIN_SERVICE = "halo-admin"

# Functions
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    # Check if Docker is installed
    try {
        docker --version | Out-Null
    }
    catch {
        Write-Error "Docker is not installed. Please install Docker first."
        exit 1
    }
    
    # Check if environment file exists
    if (-not (Test-Path "env.northflank.template")) {
        Write-Error "Environment template not found. Please ensure env.northflank.template exists."
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

function Build-Images {
    Write-Status "Building Docker images..."
    
    # Build Backend API
    Write-Status "Building Backend API image..."
    docker build -f backend/Dockerfile.prod -t halobuzz-backend ./backend
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build Backend API image"
        exit 1
    }
    
    # Build AI Engine
    Write-Status "Building AI Engine image..."
    docker build -f ai-engine/Dockerfile.prod -t halobuzz-ai ./ai-engine
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build AI Engine image"
        exit 1
    }
    
    # Build Admin Dashboard
    Write-Status "Building Admin Dashboard image..."
    docker build -f admin/Dockerfile.prod -t halobuzz-admin ./admin
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build Admin Dashboard image"
        exit 1
    }
    
    Write-Success "All Docker images built successfully"
}

function Test-Images {
    Write-Status "Testing Docker images..."
    
    # Test Backend API
    Write-Status "Testing Backend API image..."
    docker run --rm halobuzz-backend node --version
    
    # Test AI Engine
    Write-Status "Testing AI Engine image..."
    docker run --rm halobuzz-ai node --version
    
    # Test Admin Dashboard
    Write-Status "Testing Admin Dashboard image..."
    docker run --rm halobuzz-admin node --version
    
    Write-Success "All Docker images tested successfully"
}

function Test-Environment {
    Write-Status "Checking environment configuration..."
    
    if (-not (Test-Path ".env.northflank")) {
        Write-Warning "Environment file .env.northflank not found"
        Write-Status "Creating from template..."
        Copy-Item "env.northflank.template" ".env.northflank"
        Write-Warning "Please edit .env.northflank with your actual values before deploying"
        return $false
    }
    
    # Check for required variables
    $requiredVars = @("MONGODB_URI", "REDIS_URL", "JWT_SECRET", "OPENAI_API_KEY")
    $envContent = Get-Content ".env.northflank"
    
    foreach ($var in $requiredVars) {
        $found = $false
        foreach ($line in $envContent) {
            if ($line -match "^${var}=" -and $line -notmatch "^${var}=your-") {
                $found = $true
                break
            }
        }
        
        if (-not $found) {
            Write-Error "Required environment variable $var is not set or still has template value"
            return $false
        }
    }
    
    Write-Success "Environment configuration looks good"
    return $true
}

function Show-DeployInstructions {
    Write-Status "Deployment Instructions:"
    Write-Host ""
    Write-Host "1. Go to your Northflank dashboard"
    Write-Host "2. Create three new services:"
    Write-Host "   - $BACKEND_SERVICE (Backend API)"
    Write-Host "   - $AI_SERVICE (AI Engine)"
    Write-Host "   - $ADMIN_SERVICE (Admin Dashboard)"
    Write-Host ""
    Write-Host "3. For each service:"
    Write-Host "   - Set build type to 'Dockerfile'"
    Write-Host "   - Use the appropriate Dockerfile.prod"
    Write-Host "   - Set the correct build context"
    Write-Host "   - Configure ports and environment variables"
    Write-Host ""
    Write-Host "4. Deploy in this order:"
    Write-Host "   - First: $AI_SERVICE"
    Write-Host "   - Second: $BACKEND_SERVICE"
    Write-Host "   - Third: $ADMIN_SERVICE"
    Write-Host ""
    Write-Host "5. Monitor health checks and logs"
    Write-Host ""
    Write-Host "For detailed instructions, see: NORTHFLANK_DEPLOYMENT_GUIDE.md"
}

function Show-HealthCheck {
    Write-Status "Performing health checks..."
    
    Write-Host ""
    Write-Host "Expected health check URLs:"
    Write-Host "- Backend API: https://${BACKEND_SERVICE}.your-project.northflank.app/api/v1/monitoring/health"
    Write-Host "- AI Engine: https://${AI_SERVICE}.your-project.northflank.app/health"
    Write-Host "- Admin Dashboard: https://${ADMIN_SERVICE}.your-project.northflank.app/api/health"
    Write-Host ""
    Write-Host "Test with:"
    Write-Host "curl -f https://your-service-url/health-endpoint"
}

function Invoke-Cleanup {
    Write-Status "Cleaning up..."
    
    # Remove local images to save space
    try {
        docker rmi halobuzz-backend halobuzz-ai halobuzz-admin 2>$null
    }
    catch {
        # Ignore errors if images don't exist
    }
    
    Write-Success "Cleanup completed"
}

# Main execution
function Main {
    Write-Host "🚀 HaloBuzz Northflank Deployment Script" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    switch ($Action) {
        "build" {
            Test-Prerequisites
            Build-Images
            Test-Images
        }
        "check" {
            Test-Prerequisites
            Test-Environment
        }
        "deploy" {
            Test-Prerequisites
            if (Test-Environment) {
                Build-Images
                Test-Images
                Show-DeployInstructions
            }
            else {
                Write-Error "Environment check failed. Please fix environment variables first."
                exit 1
            }
        }
        "health" {
            Show-HealthCheck
        }
        "cleanup" {
            Invoke-Cleanup
        }
        default {
            Write-Host "Usage: .\deploy-northflank.ps1 [-Action {build|check|deploy|health|cleanup}]"
            Write-Host ""
            Write-Host "Commands:"
            Write-Host "  build   - Build all Docker images"
            Write-Host "  check   - Check prerequisites and environment"
            Write-Host "  deploy  - Full deployment preparation"
            Write-Host "  health  - Show health check information"
            Write-Host "  cleanup - Clean up local Docker images"
            Write-Host ""
            Write-Host "Examples:"
            Write-Host "  .\deploy-northflank.ps1 -Action build    # Build images only"
            Write-Host "  .\deploy-northflank.ps1 -Action check   # Check environment"
            Write-Host "  .\deploy-northflank.ps1 -Action deploy  # Full deployment prep"
            exit 1
        }
    }
}

# Run main function
Main

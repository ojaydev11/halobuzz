import React from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

// Types
interface AccessibilityState {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isHighContrastEnabled: boolean;
  preferredTextSize: 'small' | 'medium' | 'large' | 'extraLarge';
}

interface ResponsiveLayout {
  screenSize: 'small' | 'medium' | 'large' | 'extraLarge';
  orientation: 'portrait' | 'landscape';
}

// Device Layout Manager
class DeviceLayoutManager {
  private listeners: ((layout: ResponsiveLayout) => void)[] = [];
  private currentLayout: ResponsiveLayout | null = null;

  initialize() {
    this.updateLayout();
  }

  private updateLayout() {
    // Simplified layout detection
    const screenSize = 'medium'; // Default
    const orientation = 'portrait'; // Default
    
    this.currentLayout = { screenSize, orientation };
    this.notifyListeners();
  }

  addListener(callback: (layout: ResponsiveLayout) => void) {
    this.listeners.push(callback);
    if (this.currentLayout) {
      callback(this.currentLayout);
    }
  }

  removeListener(callback: (layout: ResponsiveLayout) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private notifyListeners() {
    if (this.currentLayout) {
      this.listeners.forEach(listener => listener(this.currentLayout!));
    }
  }

  getCurrentLayout(): ResponsiveLayout | null {
    return this.currentLayout;
  }
}

// Accessibility Manager
class AccessibilityManager {
  private listeners: ((state: AccessibilityState) => void)[] = [];
  private currentState: AccessibilityState | null = null;

  async initialize() {
    try {
      const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      
      this.currentState = {
        isScreenReaderEnabled,
        isReduceMotionEnabled,
        isHighContrastEnabled: false, // Platform specific
        preferredTextSize: 'medium'
      };

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to initialize accessibility manager:', error);
    }
  }

  addListener(callback: (state: AccessibilityState) => void) {
    this.listeners.push(callback);
    if (this.currentState) {
      callback(this.currentState);
    }
  }

  removeListener(callback: (state: AccessibilityState) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private notifyListeners() {
    if (this.currentState) {
      this.listeners.forEach(listener => listener(this.currentState!));
    }
  }

  getCurrentState(): AccessibilityState | null {
    return this.currentState;
  }
}

// Global instances
const layoutManager = new DeviceLayoutManager();
const accessibilityManager = new AccessibilityManager();

// Hooks
export const useResponsiveLayout = () => {
  const [layout, setLayout] = React.useState<ResponsiveLayout | null>(null);

  React.useEffect(() => {
    layoutManager.initialize();
    
    const handleLayoutChange = (newLayout: ResponsiveLayout) => {
      setLayout(newLayout);
    };

    layoutManager.addListener(handleLayoutChange);

    return () => {
      layoutManager.removeListener(handleLayoutChange);
    };
  }, []);

  const getResponsiveValue = React.useCallback(<T,>(values: {
    mobile?: T;
    tablet?: T;
    desktop?: T;
    default: T;
  }): T => {
    if (!layout) return values.default;

    if (layout.screenSize === 'extraLarge' && values.desktop !== undefined) {
      return values.desktop;
    }

    if (layout.screenSize === 'large' && values.tablet !== undefined) {
      return values.tablet;
    }

    if (layout.screenSize === 'small' && values.mobile !== undefined) {
      return values.mobile;
    }

    return values.default;
  }, [layout]);

  return { layout, getResponsiveValue };
};

export const useAccessibility = () => {
  const [accessibilityState, setAccessibilityState] = React.useState<AccessibilityState | null>(null);

  React.useEffect(() => {
    accessibilityManager.initialize();

    const handleAccessibilityChange = (state: AccessibilityState) => {
      setAccessibilityState(state);
    };

    accessibilityManager.addListener(handleAccessibilityChange);

    return () => {
      accessibilityManager.removeListener(handleAccessibilityChange);
    };
  }, []);

  const getAccessibleColors = React.useCallback(() => {
    const isDark = false; // Simplified
    
    return {
      primary: '#007AFF',
      secondary: '#5856D6',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      background: isDark ? '#000000' : '#FFFFFF',
      surface: isDark ? '#1C1C1E' : '#F2F2F7',
      text: isDark ? '#FFFFFF' : '#000000',
      textSecondary: isDark ? '#8E8E93' : '#6D6D70'
    };
  }, []);

  const getAccessibleTextSize = React.useCallback((baseSize: number): number => {
    if (!accessibilityState) return baseSize;

    const multipliers = {
      small: 0.85,
      medium: 1.0,
      large: 1.15,
      extraLarge: 1.3
    };

    return baseSize * multipliers[accessibilityState.preferredTextSize];
  }, [accessibilityState]);

  return {
    accessibilityState,
    getAccessibleColors,
    getAccessibleTextSize,
    isScreenReaderEnabled: accessibilityState?.isScreenReaderEnabled ?? false,
    isReduceMotionEnabled: accessibilityState?.isReduceMotionEnabled ?? false
  };
};

// Components
interface AccessibleViewProps {
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  accessibilityState?: any;
  accessibilityActions?: any[];
  onAccessibilityAction?: (event: any) => void;
  style?: any;
  testID?: string;
}

export const AccessibleView: React.FC<AccessibleViewProps> = ({
  children,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessibilityState,
  accessibilityActions,
  onAccessibilityAction,
  style,
  testID
}) => {
  const { layout } = useResponsiveLayout();
  const { getAccessibleColors } = useAccessibility();

  const colors = getAccessibleColors();
  const minTouchTarget = 44; // iOS/Android minimum touch target

  const touchTargetStyle = React.useMemo(() => {
    if (!layout) return {};

    return {
      minWidth: minTouchTarget,
      minHeight: minTouchTarget,
      justifyContent: 'center' as const,
      alignItems: 'center' as const
    };
  }, [layout]);

  const combinedStyle = React.useMemo(() => {
    return [
      {
        backgroundColor: colors.surface,
        ...touchTargetStyle
      },
      style
    ];
  }, [colors.surface, touchTargetStyle, style]);

  return (
    <React.Fragment>
      {children}
    </React.Fragment>
  );
};

interface ResponsiveTextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  style?: any;
  testID?: string;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  variant = 'body',
  style,
  testID
}) => {
  const { getResponsiveValue } = useResponsiveLayout();
  const { getAccessibleTextSize, getAccessibleColors } = useAccessibility();

  const colors = getAccessibleColors();

  const textSizes = React.useMemo(() => {
    return {
      h1: getResponsiveValue({ mobile: 28, tablet: 34, desktop: 40, default: 32 }),
      h2: getResponsiveValue({ mobile: 24, tablet: 28, desktop: 32, default: 26 }),
      h3: getResponsiveValue({ mobile: 20, tablet: 24, desktop: 28, default: 22 }),
      body: getResponsiveValue({ mobile: 16, tablet: 18, desktop: 18, default: 16 }),
      caption: getResponsiveValue({ mobile: 12, tablet: 14, desktop: 14, default: 12 })
    };
  }, [getResponsiveValue]);

  const textStyle = React.useMemo(() => {
    return {
      fontSize: getAccessibleTextSize(textSizes[variant]),
      color: colors.textPrimary,
      lineHeight: getAccessibleTextSize(textSizes[variant]) * 1.4
    };
  }, [getAccessibleTextSize, textSizes, variant, colors.textPrimary]);

  return (
    <React.Fragment>
      {children}
    </React.Fragment>
  );
};

// Focus Management Hook
export const useFocusManagement = () => {
  const focusRef = React.useRef<any>(null);

  const focusElement = React.useCallback(() => {
    if (focusRef.current?.focus) {
      focusRef.current.focus();
    }
  }, []);

  const announceLiveRegion = React.useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  return {
    focusRef,
    focusElement,
    announceLiveRegion
  };
};

// Export managers
export { DeviceLayoutManager, AccessibilityManager };
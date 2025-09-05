# 📘 HaloBuzz Operations Runbook

## 🚨 On-Call Procedures

### Alert Response Times
- **Critical (P0):** < 5 minutes
- **High (P1):** < 15 minutes  
- **Medium (P2):** < 1 hour
- **Low (P3):** < 4 hours

### Critical Alerts

#### 1. Service Down
```bash
# Check health
curl https://api.halobuzz.com/healthz

# Check pods (k8s)
kubectl get pods -n halobuzz
kubectl describe pod <pod-name> -n halobuzz

# Restart service
kubectl rollout restart deployment/backend -n halobuzz

# Check logs
kubectl logs -f deployment/backend -n halobuzz --tail=100
```

#### 2. Database Connection Lost
```bash
# Check MongoDB status
kubectl exec -it mongodb-0 -n halobuzz -- mongosh --eval "db.adminCommand('ping')"

# Check connection pool
kubectl logs deployment/backend -n halobuzz | grep "MongoNetworkError"

# Restart connection
kubectl delete pod backend-xxxx -n halobuzz
```

#### 3. Payment Failures > 10%
```bash
# Check payment provider status
curl https://api.stripe.com/v1/status
curl https://khalti.com/api/status

# Check webhook logs
kubectl logs deployment/backend -n halobuzz | grep "webhook"

# Verify idempotency
redis-cli
> KEYS payment:idempotency:*
```

#### 4. High Error Rate (>5%)
```bash
# Check error logs
kubectl logs deployment/backend -n halobuzz | grep "ERROR"

# Check metrics
curl http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])

# Scale up if needed
kubectl scale deployment/backend --replicas=5 -n halobuzz
```

## 🔄 Rollback Procedures

### Immediate Rollback (< 5 min)
```bash
# Get current revision
kubectl rollout history deployment/backend -n halobuzz

# Rollback to previous version
kubectl rollout undo deployment/backend -n halobuzz

# Verify rollback
kubectl rollout status deployment/backend -n halobuzz
kubectl get pods -n halobuzz
```

### Version-Specific Rollback
```bash
# List all revisions
kubectl rollout history deployment/backend -n halobuzz

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=42 -n halobuzz

# Verify
curl https://api.halobuzz.com/healthz
```

### Database Rollback
```bash
# Stop writes
kubectl scale deployment/backend --replicas=0 -n halobuzz

# Restore from backup
mongorestore --uri="$MONGODB_URI" --archive=backup-20240120.archive

# Verify data
mongosh $MONGODB_URI --eval "db.users.count()"

# Resume service
kubectl scale deployment/backend --replicas=3 -n halobuzz
```

## 📊 Common Issues & Solutions

### Issue: Stream Latency > 500ms
```bash
# Check Agora status
curl https://api.agora.io/v1/status

# Check CDN
curl -I https://cdn.halobuzz.com/health

# Clear Redis cache
redis-cli FLUSHDB

# Restart streaming pods
kubectl delete pod -l app=streaming -n halobuzz
```

### Issue: AI Moderation Failing
```bash
# Check model status
kubectl logs deployment/ai-engine -n halobuzz

# Fallback to manual moderation
kubectl set env deployment/backend AI_MODERATION=false -n halobuzz

# Alert moderation team
curl -X POST $SLACK_WEBHOOK -d '{"text":"AI moderation disabled - manual review required"}'
```

### Issue: Memory Leak
```bash
# Check memory usage
kubectl top pods -n halobuzz

# Get heap dump
kubectl exec backend-xxx -n halobuzz -- kill -USR2 1
kubectl cp backend-xxx:/tmp/heapdump.hprof ./heapdump.hprof -n halobuzz

# Restart affected pods
kubectl delete pod backend-xxx -n halobuzz
```

## 🔧 Maintenance Procedures

### Planned Maintenance
```bash
# 1. Enable maintenance mode
kubectl set env deployment/backend MAINTENANCE_MODE=true -n halobuzz

# 2. Drain traffic
kubectl cordon node-1
kubectl drain node-1 --ignore-daemonsets

# 3. Perform maintenance
# ... your maintenance tasks ...

# 4. Resume service
kubectl uncordon node-1
kubectl set env deployment/backend MAINTENANCE_MODE=false -n halobuzz
```

### Emergency Scale-Up
```bash
# Auto-scale based on CPU
kubectl autoscale deployment backend --min=3 --max=20 --cpu-percent=70 -n halobuzz

# Manual scale
kubectl scale deployment backend --replicas=10 -n halobuzz

# Add nodes (AWS)
eksctl scale nodegroup --cluster=halobuzz --nodes=10 --name=workers
```

## 📞 Escalation Matrix

| Severity | Contact | Response Time |
|----------|---------|---------------|
| P0 - Critical | On-call Engineer → Team Lead → CTO | 5 min |
| P1 - High | On-call Engineer → Team Lead | 15 min |
| P2 - Medium | On-call Engineer | 1 hour |
| P3 - Low | On-call Engineer (business hours) | 4 hours |

### Contacts
- **On-Call:** Use PagerDuty
- **Team Lead:** +977-xxx-xxxx
- **CTO:** +977-xxx-xxxx
- **Agora Support:** support@agora.io
- **AWS Support:** AWS Console → Support

## 📈 Key Metrics to Monitor

### Business Metrics
- Active streams
- Concurrent users  
- Payment success rate
- Gift transaction volume

### System Metrics
- API latency (p50, p95, p99)
- Error rate
- Database connections
- Redis memory usage
- Pod restarts

### Monitoring Dashboards
- **Grafana:** https://grafana.halobuzz.com
- **Prometheus:** https://prometheus.halobuzz.com
- **Sentry:** https://sentry.halobuzz.com

## 🔍 Debugging Commands

```bash
# Get all logs for last hour
kubectl logs deployment/backend --since=1h -n halobuzz > debug.log

# Follow logs with filter
kubectl logs -f deployment/backend -n halobuzz | grep -E "ERROR|CRITICAL"

# Check Redis
redis-cli ping
redis-cli INFO stats

# Check MongoDB
mongosh $MONGODB_URI --eval "db.serverStatus()"

# Network connectivity
kubectl run debug --image=nicolaka/netshoot -it --rm -n halobuzz
```

## 📝 Post-Incident Checklist

- [ ] Service restored and verified
- [ ] Root cause identified
- [ ] Temporary fixes removed
- [ ] Permanent fix deployed
- [ ] Monitoring adjusted
- [ ] Documentation updated
- [ ] Post-mortem scheduled
- [ ] Stakeholders notified

## 🔐 Emergency Access

```bash
# Break glass procedure for production access
# 1. Get approval from Team Lead
# 2. Access vault
vault login -method=ldap username=$USER
vault kv get secret/production/mongodb

# 3. Document access in incident report
```

---

**Last Updated:** January 2025
**Review Frequency:** Monthly
**Owner:** DevOps Team
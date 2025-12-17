@echo off
echo Testando login...
curl -X POST http://localhost:3000/api/admin/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
pause


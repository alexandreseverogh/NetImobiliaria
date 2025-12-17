@echo off
echo Testando API de login...
curl -X POST http://localhost:3000/api/admin/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" -v
echo.
echo.
echo Se retornar erro 500, há problema na API!
pause


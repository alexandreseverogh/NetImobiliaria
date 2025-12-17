@echo off
echo 🔍 TESTANDO API DE LOGIN COM CURL...
echo.

curl -X POST ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}" ^
  -v ^
  http://localhost:3000/api/admin/auth/login

echo.
echo ✅ Teste concluído!
pause


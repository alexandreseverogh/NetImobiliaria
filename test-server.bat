@echo off
echo Testando se o servidor está rodando...
curl -s http://localhost:3000/api/admin/auth/me
echo.
echo Se não retornar nada, o servidor não está rodando!
pause


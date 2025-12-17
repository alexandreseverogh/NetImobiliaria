-- Verificar template 2fa-code em detalhes
SELECT 
    id,
    name,
    subject,
    html_content,
    text_content,
    is_active,
    created_at
FROM email_templates 
WHERE name = '2fa-code';

-- Verificar se há campos NULL
SELECT 
    name,
    CASE 
        WHEN subject IS NULL THEN 'subject é NULL'
        ELSE 'subject OK'
    END as subject_status,
    CASE 
        WHEN html_content IS NULL THEN 'html_content é NULL'
        ELSE 'html_content OK'
    END as html_status,
    CASE 
        WHEN text_content IS NULL THEN 'text_content é NULL'
        ELSE 'text_content OK'
    END as text_status
FROM email_templates 
WHERE name = '2fa-code';



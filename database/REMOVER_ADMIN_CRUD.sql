-- Remover permissões ADMIN de funcionalidades CRUD
DELETE FROM permissions 
WHERE id IN (
    SELECT p.id
    FROM permissions p
    JOIN system_features sf ON p.feature_id = sf.id
    WHERE sf."Crud_Execute" = 'CRUD'
    AND p.action = 'ADMIN'
);

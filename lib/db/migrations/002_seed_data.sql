DELETE FROM users;
DELETE FROM roles;

INSERT INTO roles (id, name, description, permissions, policies, user_count) VALUES
  ('1', 'Admin', 'Full system access', '["read","write","delete","manage_users","manage_roles"]', '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","users:Read","users:Write","users:Create","users:Delete","users:Manage","roles:Read","roles:Manage","audit:Read","api-keys:Read","api-keys:Manage","reports:Read","reports:Export","settings:Read","system:Read","notifications:Read"]}]}]', 3),
  ('2', 'Editor', 'Can create and edit content', '["read","write"]', '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","users:Read","reports:Read","settings:Read","notifications:Read"]}]}]', 4),
  ('3', 'Viewer', 'Read-only access', '["read"]', '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","reports:Read"]}]}]', 5),
  ('4', 'Auditor', 'Access to audit logs and reports', '["read","export"]', '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","audit:Read","reports:Read","reports:Export"]}]}]', 0);

INSERT INTO users (id, name, email, role, status, created_at) VALUES
  ('1', 'Alice Johnson', 'alice@example.com', 'Admin', 'active', '2024-01-15'),
  ('2', 'Bob Smith', 'bob@example.com', 'Editor', 'active', '2024-02-20'),
  ('3', 'Carol Williams', 'carol@example.com', 'Viewer', 'active', '2024-03-10'),
  ('4', 'Dave Brown', 'dave@example.com', 'Admin', 'inactive', '2024-03-15'),
  ('5', 'Eve Davis', 'eve@example.com', 'Editor', 'active', '2024-04-01'),
  ('6', 'Frank Miller', 'frank@example.com', 'Viewer', 'active', '2024-04-15'),
  ('7', 'Grace Wilson', 'grace@example.com', 'Admin', 'active', '2024-05-01'),
  ('8', 'Hank Moore', 'hank@example.com', 'Editor', 'inactive', '2024-05-20'),
  ('9', 'Ivy Taylor', 'ivy@example.com', 'Viewer', 'active', '2024-06-01'),
  ('10', 'Jack Anderson', 'jack@example.com', 'Editor', 'active', '2024-06-15'),
  ('11', 'Karen Thomas', 'karen@example.com', 'Viewer', 'active', '2024-07-01'),
  ('12', 'Leo Garcia', 'leo@example.com', 'Auditor', 'active', '2024-07-15');

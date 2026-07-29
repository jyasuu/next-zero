export interface User {
  id: string
  name: string
  email: string
  role: string
  status: "active" | "inactive"
  createdAt: string
}

export const allRoles = ["Admin", "Editor", "Viewer", "Auditor"]

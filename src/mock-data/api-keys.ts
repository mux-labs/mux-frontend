export interface ApiKey {
  id: string;
  name: string;
  key: string;
  status: "Active" | "Revoked";
  createdAt: string;
}

export const mockApiKeys: ApiKey[] = [
  {
    id: "1",
    name: "Default Key",
    key: "sk_live_51M0L9SA9mG8G8xX5u4v5...",
    status: "Active",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    name: "Development Key",
    key: "sk_test_w3hR9A2B4C5D6E7F8G9H...",
    status: "Active",
    createdAt: "2024-01-18T14:30:00Z",
  },
  {
    id: "3",
    name: "Staging Key",
    key: "sk_stg_XyZ123AaBbCcDdEeFf...",
    status: "Revoked",
    createdAt: "2023-12-01T09:15:00Z",
  },
];

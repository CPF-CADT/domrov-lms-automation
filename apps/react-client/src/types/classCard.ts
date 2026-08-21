export type StatusFilter = "All" | "Active" | "End";

export interface ClassOwner {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ClassCard {
  id: number;
  name: string;
  description: string;
  coverImageUrl?: string;
  joinCode?: string;
  status: string;
  owner?: ClassOwner;
  role?: string;
  createdAt?: string;
  accent?: string;
  gradient?: string;
}

export interface CreateClassInput {
  name: string;
  group: string;
  generation: string;
  status?: string;
  description?: string;
  owner_id?: number;
  cover_image_url?: string;
}

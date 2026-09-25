export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface Profile {
  id: string;
  full_name: string;
  student_id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export type ItemStatus = 'Lost' | 'Found' | 'Returned' | 'Completed' | 'Archived';
export type FoundItemStatus = 'Found' | 'Claimed' | 'Returned' | 'Completed' | 'Archived';

export interface LostItem {
  id: string;
  user_id: string;
  item_name: string;
  category: string;
  description: string;
  date_lost: string;
  time_lost: string | null;
  location_lost: string;
  color: string | null;
  brand: string | null;
  identifying_features: string | null;
  image_url: string | null;
  additional_information: string | null;
  status: ItemStatus;
  previous_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoundItem {
  id: string;
  user_id: string;
  item_name: string;
  category: string;
  description: string;
  date_found: string;
  time_found: string | null;
  location_found: string;
  color: string | null;
  brand: string | null;
  identifying_features: string | null;
  image_url: string | null;
  storage_location: string | null;
  additional_information: string | null;
  status: FoundItemStatus;
  previous_status: string | null;
  created_at: string;
  updated_at: string;
}

export type MatchStatus = 'Possible' | 'Reviewed' | 'Confirmed' | 'Dismissed';

export interface Match {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  match_score: number;
  matching_reasons: string | null;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
  lost_item?: LostItem;
  found_item?: FoundItem;
}

export type ClaimStatus =
  | 'Claim Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Returned'
  | 'Completed';

export interface Claim {
  id: string;
  found_item_id: string;
  lost_item_id: string | null;
  user_id: string;
  verification_answers: Record<string, string>;
  proof_information: string | null;
  status: ClaimStatus;
  admin_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  found_item?: FoundItem;
  lost_item?: LostItem;
  user?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  related_type: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  description: string | null;
  created_at: string;
}

export const CATEGORIES = [
  'Electronics',
  'Documents',
  'Books',
  'Bags',
  'Accessories',
  'Clothing',
  'Keys',
  'ID Cards',
  'Other',
] as const;

export const CLAIM_STATUSES: ClaimStatus[] = [
  'Claim Submitted',
  'Under Review',
  'Approved',
  'Rejected',
  'Returned',
  'Completed',
];

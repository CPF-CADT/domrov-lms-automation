import type { LucideProps } from 'lucide-react';

// Re-export service types for consistency
export type { User } from '../services';
export type { CreditPackage } from '../services';
export type { Transaction } from '../services';
export type { Evaluation } from '../services';

// UI Component Props Types
export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}

export interface StatusOption {
  value: string;
  label: string;
  color: string;
}


export interface ContactInfo {
  icon: React.ReactElement<LucideProps>;
  text: string;
  href: string;
}

export interface EducationAchievement {
  title: string;
  description: string;
  slides: {
    url: string;
    caption: string;
  }[];
}

export interface EducationDetails {
  degree: string;
  university: string;
  period: string;
  description: string;
  certificateUrl: string;
  achievements: EducationAchievement[];
}

export interface EducationSlide {
  url: string;
  caption: string;
}

export type MilestoneType = 'award' | 'academic' | 'volunteer' | 'hackathon' | 'leadership';

export interface EducationMilestone {
  title: string;
  description: string;
  slides: EducationSlide[];
  certificateUrl?: string;
  type: MilestoneType;
}

export interface EducationStage {
  title: string;
  institution: string;
  period: string;
  milestones: EducationMilestone[];
}

export interface EducationJourney {
  mainTitle: string;
  mainDescription: string;
  stages: EducationStage[];
}

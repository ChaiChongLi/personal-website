import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Resume section interfaces
 */
export interface WorkExperience {
  id?: string;
  company: string;
  position: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  isCurrent: boolean;
  responsibilities: string;
  achievements: string;
}

export interface Education {
  id?: string;
  institution: string;
  degree: string;
  field: string;
  startYear: number;
  endYear: number;
  gpa?: number;
}

export interface Skill {
  id?: string;
  category: string;
  skills: string[]; // Will be stored as comma-separated in form
}

export interface Certification {
  id?: string;
  name: string;
  issuer: string;
  date: string; // YYYY-MM-DD
  url?: string;
}

export interface Project {
  id?: string;
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

/**
 * Complete resume profile interface
 */
export interface ResumeProfile {
  id: string;
  profileName: string;

  // Personal Information
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;

  // Professional Summary
  professionalSummary?: string;

  // Experience and Education
  workExperience: WorkExperience[];
  education: Education[];

  // Skills, Certifications, and Projects
  skills: Skill[];
  certifications: Certification[];
  projects: Project[];

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Resume service for managing resume profiles and export functionality
 */
@Injectable({
  providedIn: 'root'
})
export class ResumeService {
  constructor(private http: HttpClient) {}

  /**
   * Get all resume profiles for the user
   *
   * @returns Observable of array of ResumeProfile
   */
  getProfiles(): Observable<ResumeProfile[]> {
    return this.http.get<ResumeProfile[]>(`${environment.apiUrl}/resume/profiles`);
  }

  /**
   * Get a specific resume profile by ID
   *
   * @param id - Profile ID to retrieve
   * @returns Observable of ResumeProfile
   */
  getProfile(id: string): Observable<ResumeProfile> {
    return this.http.get<ResumeProfile>(`${environment.apiUrl}/resume/profiles/${id}`);
  }

  /**
   * Create a new resume profile
   *
   * @param data - Resume profile data to create
   * @returns Observable of created ResumeProfile
   */
  createProfile(data: Omit<ResumeProfile, 'id' | 'createdAt' | 'updatedAt'>): Observable<ResumeProfile> {
    return this.http.post<ResumeProfile>(`${environment.apiUrl}/resume/profiles`, data);
  }

  /**
   * Update an existing resume profile
   *
   * @param id - Profile ID to update
   * @param data - Partial profile data to update
   * @returns Observable of updated ResumeProfile
   */
  updateProfile(
    id: string,
    data: Partial<Omit<ResumeProfile, 'id' | 'createdAt' | 'updatedAt'>>
  ): Observable<ResumeProfile> {
    return this.http.put<ResumeProfile>(`${environment.apiUrl}/resume/profiles/${id}`, data);
  }

  /**
   * Delete a resume profile
   *
   * @param id - Profile ID to delete
   * @returns Observable of delete response
   */
  deleteProfile(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${environment.apiUrl}/resume/profiles/${id}`);
  }

  /**
   * Download resume as PDF
   * Returns Observable<Blob> so callers can handle errors and track completion.
   *
   * @param id - Profile ID to download
   * @param profileName - Profile name for filename (unused here; handled by caller)
   */
  downloadPDF(id: string, profileName: string): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/resume/profiles/${id}/download/pdf`,
      { responseType: 'blob' }
    );
  }

  /**
   * Download resume as Word document (.docx)
   * Returns Observable<Blob> so callers can handle errors and track completion.
   *
   * @param id - Profile ID to download
   * @param profileName - Profile name for filename (unused here; handled by caller)
   */
  downloadWord(id: string, profileName: string): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/resume/profiles/${id}/download/word`,
      { responseType: 'blob' }
    );
  }

  /**
   * Download resume as plain text
   * Returns Observable<Blob> so callers can handle errors and track completion.
   *
   * @param id - Profile ID to download
   * @param profileName - Profile name for filename (unused here; handled by caller)
   */
  downloadText(id: string, profileName: string): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/resume/profiles/${id}/download/text`,
      { responseType: 'blob' }
    );
  }

  /**
   * Generate resume preview HTML
   * Returns formatted HTML that can be displayed or printed
   *
   * @param id - Profile ID to preview
   * @returns Observable of HTML string
   */
  getPreviewHTML(id: string): Observable<{ html: string }> {
    return this.http.get<{ html: string }>(`${environment.apiUrl}/resume/profiles/${id}/preview`);
  }

  /**
   * Duplicate a resume profile
   * Creates a copy of an existing profile with new name
   *
   * @param id - Profile ID to duplicate
   * @param newProfileName - Name for the duplicated profile
   * @returns Observable of new ResumeProfile
   */
  duplicateProfile(id: string, newProfileName: string): Observable<ResumeProfile> {
    return this.http.post<ResumeProfile>(
      `${environment.apiUrl}/resume/profiles/${id}/duplicate`,
      { profileName: newProfileName }
    );
  }
}

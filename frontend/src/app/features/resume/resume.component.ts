import { Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ResumeService, ResumeProfile } from '../../core/services/resume.service';

/**
 * Resume generator and builder component
 * Multi-step form for creating and managing resume profiles
 * Supports PDF and Word export
 */
@Component({
  selector: 'app-resume',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './resume.component.html',
  styleUrls: ['./resume.component.scss']
})
export class ResumeComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  // Form group
  resumeForm!: FormGroup;

  // Data signals
  profiles = signal<ResumeProfile[]>([]);
  selectedProfile = signal<ResumeProfile | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);
  isExporting = signal(false);

  constructor(
    private formBuilder: FormBuilder,
    private resumeService: ResumeService
  ) {}

  ngOnInit(): void {
    this.loadProfiles();
    this.initializeForm();
  }

  /**
   * Initialize form with all sections
   */
  private initializeForm(): void {
    this.resumeForm = this.formBuilder.group({
      profileName: ['', [Validators.required, Validators.minLength(2)]],

      // Personal Info
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-()]+$/)]],
      location: ['', Validators.required],
      linkedinUrl: [''],
      githubUrl: [''],
      portfolioUrl: [''],

      // Professional Summary
      professionalSummary: [''],

      // Work Experience (FormArray)
      workExperience: this.formBuilder.array([]),

      // Education (FormArray)
      education: this.formBuilder.array([]),

      // Skills (FormArray)
      skills: this.formBuilder.array([]),

      // Certifications (FormArray)
      certifications: this.formBuilder.array([]),

      // Projects (FormArray)
      projects: this.formBuilder.array([])
    });

    // Add initial empty items
    this.addWorkExperience();
    this.addEducation();
    this.addSkills();
  }

  /**
   * Load existing resume profiles
   */
  private loadProfiles(): void {
    this.isLoading.set(true);

    this.resumeService.getProfiles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profiles) => {
          this.profiles.set(profiles);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading profiles:', error);
          this.isLoading.set(false);
        }
      });
  }

  /**
   * Load a profile into the form
   */
  loadProfile(profile: ResumeProfile): void {
    this.selectedProfile.set(profile);

    // Populate form with profile data
    this.resumeForm.patchValue({
      profileName: profile.profileName,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      portfolioUrl: profile.portfolioUrl,
      professionalSummary: profile.professionalSummary
    });

    // Populate work experience
    const workExpArray = this.resumeForm.get('workExperience') as FormArray;
    workExpArray.clear();
    profile.workExperience.forEach((item) => {
      workExpArray.push(this.createWorkExperienceForm(item));
    });

    // Populate education
    const eduArray = this.resumeForm.get('education') as FormArray;
    eduArray.clear();
    profile.education.forEach((item) => {
      eduArray.push(this.createEducationForm(item));
    });

    // Populate skills
    const skillsArray = this.resumeForm.get('skills') as FormArray;
    skillsArray.clear();
    profile.skills.forEach((item) => {
      skillsArray.push(this.createSkillsForm(item));
    });

    // Populate certifications
    const certArray = this.resumeForm.get('certifications') as FormArray;
    certArray.clear();
    profile.certifications.forEach((item) => {
      certArray.push(this.createCertificationForm(item));
    });

    // Populate projects
    const projArray = this.resumeForm.get('projects') as FormArray;
    projArray.clear();
    profile.projects.forEach((item) => {
      projArray.push(this.createProjectForm(item));
    });
  }

  /**
   * Create work experience form group
   */
  private createWorkExperienceForm(data?: any) {
    return this.formBuilder.group({
      company: [data?.company || '', Validators.required],
      position: [data?.position || '', Validators.required],
      startDate: [data?.startDate || '', Validators.required],
      endDate: [data?.endDate || ''],
      isCurrent: [data?.isCurrent || false],
      responsibilities: [data?.responsibilities || '', Validators.required],
      achievements: [data?.achievements || '']
    });
  }

  /**
   * Create education form group
   */
  private createEducationForm(data?: any) {
    return this.formBuilder.group({
      institution: [data?.institution || '', Validators.required],
      degree: [data?.degree || '', Validators.required],
      field: [data?.field || '', Validators.required],
      startYear: [data?.startYear || new Date().getFullYear(), Validators.required],
      endYear: [data?.endYear || new Date().getFullYear(), Validators.required],
      gpa: [data?.gpa || '']
    });
  }

  /**
   * Create skills form group
   */
  private createSkillsForm(data?: any) {
    return this.formBuilder.group({
      category: [data?.category || '', Validators.required],
      skills: [data?.skills?.join(', ') || '', Validators.required]
    });
  }

  /**
   * Create certification form group
   */
  private createCertificationForm(data?: any) {
    return this.formBuilder.group({
      name: [data?.name || '', Validators.required],
      issuer: [data?.issuer || '', Validators.required],
      date: [data?.date || '', Validators.required],
      url: [data?.url || '']
    });
  }

  /**
   * Create project form group
   */
  private createProjectForm(data?: any) {
    return this.formBuilder.group({
      name: [data?.name || '', Validators.required],
      description: [data?.description || '', Validators.required],
      technologies: [data?.technologies?.join(', ') || '', Validators.required],
      url: [data?.url || '']
    });
  }

  /**
   * Add work experience item
   */
  addWorkExperience(): void {
    const array = this.resumeForm.get('workExperience') as FormArray;
    array.push(this.createWorkExperienceForm());
  }

  /**
   * Remove work experience item
   */
  removeWorkExperience(index: number): void {
    const array = this.resumeForm.get('workExperience') as FormArray;
    array.removeAt(index);
  }

  /**
   * Add education item
   */
  addEducation(): void {
    const array = this.resumeForm.get('education') as FormArray;
    array.push(this.createEducationForm());
  }

  /**
   * Remove education item
   */
  removeEducation(index: number): void {
    const array = this.resumeForm.get('education') as FormArray;
    array.removeAt(index);
  }

  /**
   * Add skills item
   */
  addSkills(): void {
    const array = this.resumeForm.get('skills') as FormArray;
    array.push(this.createSkillsForm());
  }

  /**
   * Remove skills item
   */
  removeSkills(index: number): void {
    const array = this.resumeForm.get('skills') as FormArray;
    array.removeAt(index);
  }

  /**
   * Add certification item
   */
  addCertification(): void {
    const array = this.resumeForm.get('certifications') as FormArray;
    array.push(this.createCertificationForm());
  }

  /**
   * Remove certification item
   */
  removeCertification(index: number): void {
    const array = this.resumeForm.get('certifications') as FormArray;
    array.removeAt(index);
  }

  /**
   * Add project item
   */
  addProject(): void {
    const array = this.resumeForm.get('projects') as FormArray;
    array.push(this.createProjectForm());
  }

  /**
   * Remove project item
   */
  removeProject(index: number): void {
    const array = this.resumeForm.get('projects') as FormArray;
    array.removeAt(index);
  }

  /**
   * Save resume profile
   */
  saveProfile(): void {
    if (this.resumeForm.invalid) {
      return;
    }

    this.isSaving.set(true);
    const formValue = this.resumeForm.value;

    // Convert skills arrays
    formValue.skills = formValue.skills.map((skill: any) => ({
      category: skill.category,
      skills: skill.skills.split(',').map((s: string) => s.trim())
    }));

    // Convert technologies arrays
    formValue.projects = formValue.projects.map((project: any) => ({
      ...project,
      technologies: project.technologies.split(',').map((t: string) => t.trim())
    }));

    // Map camelCase form fields to snake_case backend fields
    const payload = {
      profile_name: formValue.profileName,
      personal_info: {
        name: formValue.fullName,
        email: formValue.email,
        phone: formValue.phone,
        location: formValue.location,
        linkedin_url: formValue.linkedinUrl,
        github_url: formValue.githubUrl,
        portfolio_url: formValue.portfolioUrl
      },
      summary: formValue.professionalSummary,
      work_experience: formValue.workExperience,
      education: formValue.education,
      skills: formValue.skills,
      certifications: formValue.certifications,
      projects: formValue.projects
    };

    const request = this.selectedProfile()
      ? this.resumeService.updateProfile(this.selectedProfile()!.id, payload as any)
      : this.resumeService.createProfile(payload as any);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (profile) => {
        const profiles = this.profiles();
        const index = profiles.findIndex((p) => p.id === profile.id);

        if (index !== -1) {
          profiles[index] = profile;
        } else {
          profiles.push(profile);
        }

        this.profiles.set([...profiles]);
        this.selectedProfile.set(profile);
        this.isSaving.set(false);
      },
      error: (error) => {
        console.error('Error saving profile:', error);
        this.isSaving.set(false);
      }
    });
  }

  /**
   * Download resume as PDF
   */
  downloadPDF(): void {
    if (!this.selectedProfile()) return;

    this.isExporting.set(true);
    const profile = this.selectedProfile()!;
    this.resumeService.downloadPDF(profile.id, profile.profileName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${profile.profileName}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          this.isExporting.set(false);
        },
        error: (error) => {
          console.error('Error downloading PDF:', error);
          this.isExporting.set(false);
        }
      });
  }

  /**
   * Download resume as Word
   */
  downloadWord(): void {
    if (!this.selectedProfile()) return;

    this.isExporting.set(true);
    const profile = this.selectedProfile()!;
    this.resumeService.downloadWord(profile.id, profile.profileName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${profile.profileName}.docx`;
          link.click();
          URL.revokeObjectURL(url);
          this.isExporting.set(false);
        },
        error: (error) => {
          console.error('Error downloading Word document:', error);
          this.isExporting.set(false);
        }
      });
  }

  /**
   * Delete profile
   */
  deleteProfile(profile: ResumeProfile): void {
    if (confirm(`Delete "${profile.profileName}" profile?`)) {
      this.resumeService.deleteProfile(profile.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.profiles.set(this.profiles().filter((p) => p.id !== profile.id));
          if (this.selectedProfile()?.id === profile.id) {
            this.selectedProfile.set(null);
            this.resumeForm.reset();
          }
        },
        error: (error) => {
          console.error('Error deleting profile:', error);
        }
      });
    }
  }

  /**
   * Create new profile
   */
  newProfile(): void {
    this.selectedProfile.set(null);
    this.resumeForm.reset();
  }

  /**
   * Get work experience form array
   */
  get workExperience(): FormArray {
    return this.resumeForm.get('workExperience') as FormArray;
  }

  get education(): FormArray {
    return this.resumeForm.get('education') as FormArray;
  }

  get skills(): FormArray {
    return this.resumeForm.get('skills') as FormArray;
  }

  get certifications(): FormArray {
    return this.resumeForm.get('certifications') as FormArray;
  }

  get projects(): FormArray {
    return this.resumeForm.get('projects') as FormArray;
  }

  /**
   * Typed getters that cast FormArray controls to FormGroup[].
   * Required because FormArray.controls returns AbstractControl[],
   * but templates need FormGroup for [formGroup]="item" binding.
   */
  get workExperienceGroups(): FormGroup[] {
    return this.workExperience.controls as FormGroup[];
  }

  get educationGroups(): FormGroup[] {
    return this.education.controls as FormGroup[];
  }

  get skillGroups(): FormGroup[] {
    return this.skills.controls as FormGroup[];
  }

  get certificationGroups(): FormGroup[] {
    return this.certifications.controls as FormGroup[];
  }

  get projectGroups(): FormGroup[] {
    return this.projects.controls as FormGroup[];
  }

}

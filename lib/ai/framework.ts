import type { FlagSeverity, ReviewLayer } from "@/app/generated/prisma/client";

// Single source of truth for the structured IEP review framework (developmental/
// educational quality review, Philippines SPED context). Both the prompt builder
// and the severity classifier import from here so the vocabulary never drifts
// between what the model is told and what the app validates against.

export interface LayerDefinition {
  key: ReviewLayer;
  name: string;
  purpose: string;
  checkItems?: string[];
  domains?: string[];
  evaluationQuestions?: string[];
  goalChecks?: string[];
  goalStructure?: string[];
  consistencyChecks?: string[];
  commonFlags: string[];
}

export const LAYERS: LayerDefinition[] = [
  {
    key: "STUDENT_UNDERSTANDING",
    name: "Student Understanding",
    purpose: "Determine whether the IEP clearly describes who the child is.",
    checkItems: [
      "Strengths",
      "Interests",
      "Preferences",
      "Learning style",
      "Communication style",
      "Developmental profile",
      "Medical information affecting learning",
      "Family concerns",
      "Teacher observations",
    ],
    evaluationQuestions: [
      "Does the IEP describe the child, not just the disability label?",
      "Are strengths and family voice present?",
      "Does the profile feel individualized and specific?",
    ],
    commonFlags: [
      "Student sounds generic",
      "Strengths are missing",
      "Family voice is absent",
      "Disability label is described instead of the child",
    ],
  },
  {
    key: "DEVELOPMENTAL_ASSESSMENT",
    name: "Developmental Assessment",
    purpose: "Check whether the child's current developmental level is described clearly.",
    domains: [
      "Academic",
      "Communication",
      "Social",
      "Behavior",
      "Emotional regulation",
      "Adaptive skills",
      "Motor skills",
      "Executive functioning",
      "Play skills",
      "Independence",
    ],
    evaluationQuestions: [
      "Is each relevant area described?",
      "Is there evidence or baseline data?",
      "Are observations specific and observable?",
      "Does the profile identify both strengths and needs?",
    ],
    commonFlags: [
      "Description is vague",
      "No baseline data",
      "Current performance is unclear",
      "Needs are stated without evidence",
    ],
  },
  {
    key: "GOAL_QUALITY",
    name: "Goal Quality",
    purpose: "Assess whether goals are meaningful, measurable, realistic, and developmentally appropriate.",
    goalChecks: [
      "Based on a real need",
      "Measurable",
      "Realistic",
      "Age appropriate",
      "Developmentally appropriate",
      "Meaningful",
      "Observable",
      "Functional when relevant",
    ],
    goalStructure: ["Condition", "Observable behavior", "Criterion", "Baseline or starting point when available", "Time frame"],
    commonFlags: [
      "Goal is too broad",
      "Goal is not measurable",
      "Goal does not match the student need",
      "Goal is copied from a template",
      "Goal is an activity, not an outcome",
    ],
  },
  {
    key: "INTERVENTION_ALIGNMENT",
    name: "Intervention Alignment",
    purpose: "Check whether the IEP explains how the goals will be supported.",
    checkItems: ["Teaching strategies", "Accommodations", "Modifications", "Supports", "Responsible person", "Timeline", "Progress monitoring"],
    evaluationQuestions: [
      "Is there an instructional or support plan for each goal?",
      "Does the intervention match the need?",
      "Is it clear who will do what and how often?",
    ],
    commonFlags: [
      "Goal is present but no teaching strategy is listed",
      "Support is too generic",
      "No responsible person is identified",
      "No progress monitoring method is listed",
    ],
  },
  {
    key: "OVERALL_CONSISTENCY",
    name: "Overall Consistency",
    purpose: "Cross-check whether all parts of the IEP align with each other.",
    consistencyChecks: [
      "Present levels match goals",
      "Goals match services and supports",
      "Accommodations match needs",
      "Placement matches service intensity",
      "Assessment decisions match documented needs",
      "Dates, locations, and durations do not conflict",
    ],
    commonFlags: [
      "Goal has no matching need",
      "Service has no matching goal",
      "Placement seems broader than necessary",
      "Two sections conflict with each other",
    ],
  },
];

export const SEVERITY_LEVELS: { level: FlagSeverity; label: string; meaning: string }[] = [
  { level: "CRITICAL", label: "Critical", meaning: "The IEP cannot be implemented well as written." },
  { level: "MAJOR", label: "Major", meaning: "The IEP is usable but has important weaknesses." },
  { level: "MINOR", label: "Minor", meaning: "The IEP is mostly functional, but needs quality improvements." },
  { level: "SUGGESTION", label: "Suggestion", meaning: "Optional improvement that may strengthen clarity or usefulness." },
];

export const REVIEW_RULES: string[] = [
  "Check presence first, then quality.",
  "Prefer evidence-based flags over vague criticism.",
  "When uncertain, label an item as Needs Review rather than Pass.",
  "Cross-check sections for contradictions.",
  "Avoid legal conclusions; focus on educational usefulness and developmental fit.",
];

export interface FrameworkCategory {
  key: string;
  layer: ReviewLayer;
  label: string;
}

// snake_case categories derived from each layer's common_flags.
export const FRAMEWORK_CATEGORIES: FrameworkCategory[] = [
  { key: "student_sounds_generic", layer: "STUDENT_UNDERSTANDING", label: "Student sounds generic" },
  { key: "strengths_missing", layer: "STUDENT_UNDERSTANDING", label: "Strengths are missing" },
  { key: "family_voice_absent", layer: "STUDENT_UNDERSTANDING", label: "Family voice is absent" },
  { key: "disability_label_not_child", layer: "STUDENT_UNDERSTANDING", label: "Disability label is described instead of the child" },

  { key: "vague_description", layer: "DEVELOPMENTAL_ASSESSMENT", label: "Description is vague" },
  { key: "no_baseline_data", layer: "DEVELOPMENTAL_ASSESSMENT", label: "No baseline data" },
  { key: "unclear_current_performance", layer: "DEVELOPMENTAL_ASSESSMENT", label: "Current performance is unclear" },
  { key: "needs_without_evidence", layer: "DEVELOPMENTAL_ASSESSMENT", label: "Needs are stated without evidence" },

  { key: "goal_too_broad", layer: "GOAL_QUALITY", label: "Goal is too broad" },
  { key: "goal_not_measurable", layer: "GOAL_QUALITY", label: "Goal is not measurable" },
  { key: "goal_mismatched_need", layer: "GOAL_QUALITY", label: "Goal does not match the student need" },
  { key: "goal_copied_from_template", layer: "GOAL_QUALITY", label: "Goal is copied from a template" },
  { key: "goal_is_activity_not_outcome", layer: "GOAL_QUALITY", label: "Goal is an activity, not an outcome" },

  { key: "no_teaching_strategy", layer: "INTERVENTION_ALIGNMENT", label: "Goal is present but no teaching strategy is listed" },
  { key: "support_too_generic", layer: "INTERVENTION_ALIGNMENT", label: "Support is too generic" },
  { key: "no_responsible_person", layer: "INTERVENTION_ALIGNMENT", label: "No responsible person is identified" },
  { key: "no_progress_monitoring", layer: "INTERVENTION_ALIGNMENT", label: "No progress monitoring method is listed" },

  { key: "goal_no_matching_need", layer: "OVERALL_CONSISTENCY", label: "Goal has no matching need" },
  { key: "service_no_matching_goal", layer: "OVERALL_CONSISTENCY", label: "Service has no matching goal" },
  { key: "placement_broader_than_necessary", layer: "OVERALL_CONSISTENCY", label: "Placement seems broader than necessary" },
  { key: "section_conflict", layer: "OVERALL_CONSISTENCY", label: "Two sections conflict with each other" },
];

// Writing-quality categories: additive, cross-cutting, not part of the
// framework's own JSON, but proven valuable this session — kept as a
// MINOR/SUGGESTION-only category set usable from any layer's content.
export const WRITING_QUALITY_CATEGORIES = [
  "grammar",
  "clarity",
  "duplicate_phrasing",
  "formatting",
  "word_choice",
  "awkward_phrasing",
] as const;

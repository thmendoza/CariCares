import { Program } from "@/app/generated/prisma/client";

const RUBRICS: Record<Program, string> = {
  FULL_INCLUSION_NO_SERVICES: `
## Full Inclusion — No Services Rubric

The student attends regular classes with no pull-out and no shadow teacher. This IEP must reflect near-typical functioning with only minor supports.

**Required elements:**
- Goals must be at or near grade level; measurable with a clear baseline and target
- Accommodations only (no modifications) — examples: extended time, preferential seating, chunked instructions, reduced distraction environment
- No therapy goals (OT, PT, speech) unless a separate service mandate exists
- Present Level of Performance (PLOP) must justify the inclusion placement
- Annual goals should be achievable without specialized instruction pull-out

**Red flags (typically Critical or Major):**
- Goals that are significantly below grade level without justification
- Inclusion of therapy goals (OT/PT/speech) when no therapy service is indicated
- Heavy modifications (e.g. reduced curriculum content, alternate grading) — these suggest wrong program placement
- PLOP describes significant delays inconsistent with full inclusion

**Lower-severity issues (typically Minor or Suggestion):**
- Missing baseline scores in goals (measurability gap)
- Vague accommodation language ("as needed", "as appropriate")
- Missing parent participation notes
`.trim(),

  FULL_INCLUSION_SHADOW: `
## Full Inclusion — Shadow Teacher Rubric

The student attends regular classes with a dedicated shadow/aide. IEP must address the shadow role and plan for independence.

**Required elements:**
- Clear description of shadow teacher's role and scope (academic support, behavior, social cues)
- Fading plan: explicit schedule or criteria for reducing shadow support over time
- Social integration goals: peer interaction, independence in group work
- Goals that address the specific reason the shadow is needed
- PLOP must document current dependency on shadow support

**Red flags (typically Critical or Major):**
- No fading plan or criteria for shadow reduction — shadow support is not meant to be permanent
- No peer interaction or social independence goals
- Goals that assume permanent shadow presence with no movement toward independence
- PLOP does not describe why the shadow is necessary

**Lower-severity issues (typically Minor or Suggestion):**
- Fading plan lacks specific timelines
- Social goals are vague or not measurable
- Missing parent input on shadow relationship
`.trim(),

  PARTIAL_INCLUSION_PULLOUT: `
## Partial Inclusion — Pull-Out Rubric

The student spends most of the day in regular class but is pulled out for specific subjects or therapies.

**Required elements:**
- Explicit specification of pull-out schedule: which subjects, how many minutes/hours per week
- Goals for both the pull-out setting (remediation) and general education setting (generalization)
- Transition goals: how the student will move between settings, what supports are available during re-entry
- PLOP must identify the specific areas requiring pull-out support
- Coordination plan between the pull-out specialist and the regular class teacher

**Red flags (typically Critical or Major):**
- Vague or missing pull-out schedule ("as needed" is insufficient — must specify)
- No plan for how skills learned in pull-out will transfer to the regular classroom
- Goals written only for pull-out setting with no generalization component
- PLOP describes deficits not addressed by the pull-out structure

**Lower-severity issues (typically Minor or Suggestion):**
- Pull-out schedule specified in hours but not tied to specific subjects
- Coordination plan is mentioned but lacks names or meeting frequency
- Goals have measurable targets but missing baseline data
`.trim(),

  PARTIAL_INCLUSION_INTENSIVE: `
## Partial Inclusion — Intensive SPED Rubric

The student is based primarily in a SPED classroom and included in regular education for electives, social periods, or select subjects.

**Required elements:**
- Intensive, highly measurable skill-building goals across all deficit areas
- Clear criteria for which regular-education settings the student participates in and why
- Inclusion schedule with specific classes/periods and the supports provided during those periods
- Social and communication goals relevant to the inclusion setting
- Regular review schedule (more frequent than standard IEP cycle) given intensive support needs

**Red flags (typically Critical or Major):**
- Goals are not measurable (e.g. "will improve" with no target or baseline)
- No criteria specified for inclusion periods — student is included without clear rationale or support plan
- Missing safety or behavioral goals if the student has known behavioral needs
- PLOP does not justify the intensive placement level

**Lower-severity issues (typically Minor or Suggestion):**
- Inclusion schedule is listed but supports during those periods are not described
- Goals are measurable but review schedule is annual only — quarterly reviews recommended
- Parent training component is absent
`.trim(),

  PRE_VOCATIONAL: `
## Pre-Vocational Rubric

The student is secondary age (typically 14+) and the IEP must address transition to adult life, employment, and post-secondary education or training.

**Required elements:**
- Vocational interest/skills assessment results documented in PLOP
- Job-readiness goals: workplace communication, time management, task completion, following multi-step instructions
- Transition plan (mandatory for students 16+ in many jurisdictions, best practice from 14): post-secondary goals for employment, education/training, and independent living
- Community-based instruction or work experience activities if appropriate
- Functional academic skills goals (reading workplace documents, basic math for money, time)

**Red flags (typically Critical or Major):**
- No transition plan for a student 14+ — this is typically legally required
- Goals are purely academic with no functional or vocational component
- No linkage to post-secondary services (vocational rehabilitation, community agencies)
- PLOP has no vocational assessment data

**Lower-severity issues (typically Minor or Suggestion):**
- Transition goals exist but lack specific post-secondary vision statement
- Work experience goals are written but no placement or schedule identified
- Parent/student input on post-secondary preferences is missing from PLOP
`.trim(),

  EARLY_CHILDHOOD: `
## Early Childhood Rubric

The student is ages 3–8. Goals and strategies must reflect developmental appropriateness, play-based learning, and strong family involvement.

**Required elements:**
- Goals aligned to developmental milestones for the child's age (not grade-level academic standards)
- Play-based and naturalistic intervention strategies embedded in daily routines
- Family/caregiver goals or participation plan — early childhood IEPs require active family involvement
- Functional communication goals if there are any speech/language concerns
- Transition plan if the child is approaching kindergarten entry (age 4–5 transition)

**Red flags (typically Critical or Major):**
- Goals written in adult or academic-learning style inappropriate for ages 3–8 (e.g. "will complete written worksheets independently")
- No family participation plan or family-centered outcomes
- Goals that are age-inappropriate (too advanced or too low without justification)
- Missing communication/language goals for a child with documented communication delays

**Lower-severity issues (typically Minor or Suggestion):**
- Goals are developmentally appropriate but lack clear measurement criteria
- Play-based strategies mentioned without describing specific routines or activities
- Transition to kindergarten plan is absent for a child nearing age 5
`.trim(),
};

export function getRubric(program: Program | null): string {
  return RUBRICS[program ?? "FULL_INCLUSION_NO_SERVICES"];
}

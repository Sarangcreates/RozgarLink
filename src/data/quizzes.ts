import { canonicalSkill } from "../engine/skills";
const facts: Record<string, string[]> = {
  Excel: [
    "A formula begins with an equals sign.",
    "SUM adds numeric values in a range.",
    "Filtering can display rows matching a condition.",
  ],
  SQL: [
    "SELECT retrieves data from a table.",
    "WHERE filters rows using a condition.",
    "A JOIN combines related rows from tables.",
  ],
  React: [
    "State changes can trigger a component render.",
    "Keys identify items in a rendered list.",
    "Props pass data into a component.",
  ],
  JavaScript: [
    "An array stores an ordered collection.",
    "A Promise represents an asynchronous result.",
    "Strict equality compares without type coercion.",
  ],
  "Node.js": [
    "Node.js runs JavaScript outside the browser.",
    "Asynchronous I/O can avoid blocking the event loop.",
    "A package manifest records project dependencies.",
  ],
  Git: [
    "A commit records a snapshot of tracked changes.",
    "A branch supports a separate line of development.",
    "A merge conflict requires reviewing overlapping changes.",
  ],
  Docker: [
    "A container runs an application with its packaged environment.",
    "An image is a template used to create containers.",
    "A volume can preserve data beyond a container lifecycle.",
  ],
  Python: [
    "Indentation defines code blocks.",
    "A list is an ordered mutable collection.",
    "A function can return a result to its caller.",
  ],
  Statistics: [
    "The mean is the sum divided by the count.",
    "The median is the middle value after sorting.",
    "Correlation alone does not prove causation.",
  ],
  "Data Visualization": [
    "Axis labels help readers interpret a chart.",
    "A line chart can show change over time.",
    "A misleading axis can distort a comparison.",
  ],
  Communication: [
    "Active listening includes checking your understanding.",
    "A clear message considers its audience.",
    "Constructive feedback describes specific observable behaviour.",
  ],
  "Basic Computer": [
    "Folders organise files.",
    "A strong password should not be reused across accounts.",
    "Saving a document preserves changes to a file.",
  ],
  Safety: [
    "Follow the approved safety procedure for the task.",
    "Report hazards through the designated process.",
    "Use the protective equipment required for the task.",
  ],
  Welding: [
    "Approved procedures specify parameters for the weld.",
    "Protective equipment must suit the welding process.",
    "Inspection checks the weld against stated requirements.",
  ],
  "Machine Operation": [
    "Follow the machine’s approved operating procedure.",
    "Guards protect against contact with moving parts.",
    "Faults should be reported before continued operation.",
  ],
  CAD: [
    "Dimensions describe the intended size of a component.",
    "Layers can organise drawing elements.",
    "Drawing units must match the project requirements.",
  ],
  "Quality Control": [
    "Inspection compares a result with stated requirements.",
    "A defect should be recorded with traceable evidence.",
    "Sampling examines a defined subset of items.",
  ],
  "First Aid": [
    "Assess scene safety before approaching.",
    "Use the approved emergency-contact process.",
    "Work within the limits of your training.",
  ],
  "Medical Records": [
    "Patient records require authorised access.",
    "Accuracy and traceability matter in documentation.",
    "Corrections should follow the approved record procedure.",
  ],
};
export function quizForSkill(skill: string) {
  const name = canonicalSkill(skill),
    statements = facts[name];
  if (!statements) return [];
  return statements.map((fact, i) => {
    const options = [
      "Ignore all stated requirements.",
      "Guess without checking the result.",
      "Use unrelated information as evidence.",
    ];
    options[i] = fact;
    return {
      question: `${name}: which statement is correct? (${i + 1})`,
      options,
      answer: i,
    };
  });
}

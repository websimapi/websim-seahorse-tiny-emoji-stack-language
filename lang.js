// Small Seahorse-language implementation (pure JS).
// The language uses contiguous runs of the seahorse emoji (🧜‍♂️) as tokens.
// Exports parseProgram(text) -> instructions[], and a VM class.

export function normalizeSeahorseEmoji() {
  // provide accepted glyphs to be tolerant; canonical seahorse used in UI is "🧜" + optional gender/zwj.
  // treat any of these characters as the seahorse token:
  const variants = ["🧜","🧜‍♂️","🧜‍♀️","🧜‍♂","🧜‍♀","🧜‍♀️","🧜‍♂️","🐚","🐴","🦪"];
  return variants;
}

export function parseProgram(text) {
  // identify contiguous runs of accepted seahorse glyphs ignoring other characters and whitespace
  const variants = normalizeSeahorseEmoji();
  // build a regex to match any of the variants
  const escaped = variants.map(v => v.replace(/([\[\]\(\)\{\}\*\+\?\.\^\\\|])/g,'\\$1')).join('|');
  const runRegex = new RegExp(`(?:${escaped})+`,'g');
  const runs = [...text.matchAll(runRegex)].map(m => m[0]);
  // convert each run into its length (count of glyphs). Counting glyphs roughly by matching variants repeatedly.
  const instructions = runs.map(run => {
    // count occurrences of any variant in sequence by repeatedly slicing
    let remaining = run;
    let count = 0;
    while (remaining.length > 0) {
      let matched = false;
      for (const v of variants) {
        if (remaining.startsWith(v)) {
          count++;
          remaining = remaining.slice(v.length);
          matched = true;
          break;
        }
      }
      if (!matched) {
        // fallback: consume one codepoint (avoid infinite loop)
        remaining = remaining.slice(1);
      }
    }
    return count;
  });
  return instructions;
}

export class SeahorseVM {
  constructor({instructions=[], inputProvider=()=>0, onOutput=(s)=>{}, onTrace=()=>{}}={}) {
    this.instructions = instructions.slice();
    this.ip = 0;
    this.stack = [];
    this.output = "";
    this.running = false;
    this.inputProvider = inputProvider;
    this.onOutput = onOutput;
    this.onTrace = onTrace;
    this.stepLimit = 10000;
    this.steps = 0;
  }

  reset(instructions) {
    if (instructions) this.instructions = instructions.slice();
    this.ip = 0;
    this.stack = [];
    this.output = "";
    this.running = false;
    this.steps = 0;
  }

  step() {
    if (this.ip < 0 || this.ip >= this.instructions.length) {
      this.onTrace(`IP out of bounds (${this.ip}). HALT.`);
      this.running = false;
      return false;
    }
    const op = this.instructions[this.ip];
    this.onTrace(`IP=${this.ip} OP=${op}`);
    this.ip++;
    this.steps++;
    if (this.steps > this.stepLimit) {
      this.onTrace("Step limit reached. HALT.");
      this.running = false;
      return false;
    }
    // 1-9: push
    if (op >= 1 && op <= 9) {
      this.stack.push(op);
      return true;
    }
    switch(op) {
      case 10: { // ADD
        const a = this.stack.pop()||0;
        const b = this.stack.pop()||0;
        this.stack.push(b + a);
        return true;
      }
      case 11: { // SUB b - a
        const a = this.stack.pop()||0;
        const b = this.stack.pop()||0;
        this.stack.push(b - a);
        return true;
      }
      case 12: { // MUL
        const a = this.stack.pop()||0;
        const b = this.stack.pop()||0;
        this.stack.push(b * a);
        return true;
      }
      case 13: { // DIV integer (handle div by zero)
        const a = this.stack.pop()||0;
        const b = this.stack.pop()||0;
        const result = a === 0 ? 0 : Math.trunc(b / a);
        this.stack.push(result);
        return true;
      }
      case 14: { // PRINT
        const v = this.stack.pop()||0;
        this.output += String(v) + "\n";
        this.onOutput(this.output);
        return true;
      }
      case 15: { // DUP
        const v = this.stack[this.stack.length-1]||0;
        this.stack.push(v);
        return true;
      }
      case 16: { // POP
        this.stack.pop();
        return true;
      }
      case 17: { // READ
        const v = Number(this.inputProvider()) || 0;
        this.stack.push(v);
        return true;
      }
      case 18: { // JMP (pop target index)
        const t = Number(this.stack.pop()||0);
        if (t < 0 || t >= this.instructions.length) {
          this.onTrace(`JMP target out of bounds (${t}), ignored.`);
        } else {
          this.ip = t;
        }
        return true;
      }
      case 19: { // JZ (pop value then target)
        const t = Number(this.stack.pop()||0);
        const v = Number(this.stack.pop()||0);
        if (v === 0) {
          if (t < 0 || t >= this.instructions.length) {
            this.onTrace(`JZ target out of bounds (${t}), ignored.`);
          } else {
            this.ip = t;
          }
        }
        return true;
      }
      case 20: { // HALT
        this.onTrace("HALT");
        this.running = false;
        return false;
      }
      default:
        this.onTrace(`Unknown opcode ${op} — ignored`);
        return true;
    }
  }

  run() {
    this.running = true;
    while (this.running) {
      const cont = this.step();
      if (!cont) break;
    }
    return this.output;
  }
}


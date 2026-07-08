/* Laboratorio de Conjuntos - Álgebra
   Versión dinámica 1/2/3 conjuntos. Sin dependencias externas. */

const $ = (id) => document.getElementById(id);

const COLORS = [
  '#4285f4', // Google blue
  '#db4437', // Google red
  '#f4b400', // Google yellow
  '#0f9d58', // Google green
  '#7e57c2',
  '#00acc1',
  '#f4511e',
  '#607d8b'
];

const BASE_SET_DEFS = [
  { id: 'setA', name: 'A' },
  { id: 'setB', name: 'B' },
  { id: 'setC', name: 'C' }
];

const EXAMPLES = [
  {
    A: '{1,{1},{2,3}}',
    B: '{{1},2,3}',
    C: '{3,a,{a,b}}',
    U: '{1,2,3,a,{1},{2,3},{a,b}}',
    X: '{1}',
    E: 'A ∪ B'
  },
  {
    A: '{1,2,3}',
    B: '',
    C: '',
    U: '{1,2,3,4,5}',
    X: '{1}',
    E: 'A^c'
  },
  {
    A: '{1,2,3,5,8}',
    B: '{3,4,5,10}',
    C: '',
    U: '{1,2,3,4,5,6,7,8,9,10}',
    X: '3',
    E: '(A ∪ B)^c'
  },
  {
    A: '{{1},{1,2},{1,2,3},{1,2,3,4}}',
    B: '{{1},{1,2,3}}',
    C: '',
    U: '{{1},{1,2},{1,2,3},{1,2,3,4},1,2,3,4}',
    X: '{1}',
    E: 'B ⊆ A'
  },
  {
    A: '{rojo, blanco, azul}',
    B: '{azul, verde, amarillo}',
    C: '{blanco, negro, amarillo}',
    U: '{rojo, blanco, azul, verde, amarillo, negro, gris}',
    X: '{rojo}',
    E: 'A △ B'
  }
];

let exampleIndex = 0;
let lastState = null;
let vennCustomExpression = '';
let vennZoom = 1;

class SyntaxErrorSet extends Error {
  constructor(message, index = 0) {
    super(message);
    this.index = index;
  }
}

class SetSyntaxParser {
  constructor(text) {
    this.text = String(text ?? '').trim();
    this.i = 0;
  }

  parseValue() {
    this.skip();
    if (this.text.length === 0) throw new SyntaxErrorSet('Entrada vacía.', 0);
    const value = this.readValue();
    this.skip();
    if (this.i < this.text.length) {
      throw new SyntaxErrorSet(`Sobran caracteres desde: "${this.text.slice(this.i)}".`, this.i);
    }
    return value;
  }

  readValue() {
    this.skip();
    const ch = this.peek();
    if (ch === '{') return this.readSet();
    if (ch === '∅' || ch === 'Ø' || ch === ';') { this.i++; return makeSet([]); }
    if (this.text.slice(this.i, this.i + 5).toLowerCase() === 'set()') { this.i += 5; return makeSet([]); }
    if (ch === '"' || ch === "'") return makeAtom(this.readQuoted());
    return makeAtom(this.readAtomToken());
  }

  readSet() {
    this.expect('{');
    const items = [];
    this.skip();
    if (this.peek() === '}') { this.i++; return makeSet(items); }
    while (this.i < this.text.length) {
      items.push(this.readValue());
      this.skip();
      const ch = this.peek();
      if (ch === ',') { this.i++; this.skip(); continue; }
      if (ch === '}') { this.i++; return makeSet(items); }
      throw new SyntaxErrorSet(`Esperaba coma o cierre } cerca de: "${this.text.slice(this.i)}".`, this.i);
    }
    throw new SyntaxErrorSet('Falta cerrar una llave }.', this.i);
  }

  readQuoted() {
    const quote = this.peek();
    this.i++;
    let out = '';
    while (this.i < this.text.length) {
      const ch = this.text[this.i++];
      if (ch === '\\') {
        if (this.i < this.text.length) out += this.text[this.i++];
        continue;
      }
      if (ch === quote) return out;
      out += ch;
    }
    throw new SyntaxErrorSet('Falta cerrar comillas.', this.i);
  }

  readAtomToken() {
    const start = this.i;
    while (this.i < this.text.length) {
      const ch = this.text[this.i];
      if (/[{},()\s]/.test(ch)) break;
      this.i++;
    }
    const token = this.text.slice(start, this.i).trim();
    if (!token) throw new SyntaxErrorSet('Esperaba un elemento.', start);
    if (/^-?\d+(?:[\.,]\d+)?$/.test(token)) return Number(token.replace(',', '.'));
    return token;
  }

  skip() { while (/\s/.test(this.peek())) this.i++; }
  peek() { return this.text[this.i] ?? ''; }
  expect(ch) {
    if (this.peek() !== ch) throw new SyntaxErrorSet(`Esperaba ${ch}.`, this.i);
    this.i++;
  }
}

function parseLooseValue(text) {
  return new SetSyntaxParser(text).parseValue();
}

function makeAtom(value) {
  return { kind: 'atom', value };
}

function makeSet(items) {
  const map = new Map();
  for (const item of items) map.set(keyOf(item), item);
  const unique = Array.from(map.values()).sort(compareValues);
  return { kind: 'set', items: unique };
}

function isSet(v) { return v && v.kind === 'set'; }
function isAtom(v) { return v && v.kind === 'atom'; }

function keyOf(v) {
  if (isSet(v)) return `S:{${v.items.map(keyOf).sort().join('|')}}`;
  const type = typeof v.value;
  return `A:${type}:${String(v.value)}`;
}

function compareValues(a, b) {
  return renderValue(a).localeCompare(renderValue(b), 'es', { numeric: true, sensitivity: 'base' });
}

function renderValue(v) {
  if (isSet(v)) {
    if (v.items.length === 0) return '∅';
    return `{${v.items.map(renderValue).join(', ')}}`;
  }
  if (typeof v.value === 'number') return Number.isInteger(v.value) ? String(v.value) : String(v.value);
  const s = String(v.value);
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ_][\wÁÉÍÓÚÜÑáéíóúüñ-]*$/.test(s) ? s : JSON.stringify(s);
}

function cardinal(set) { return set.items.length; }
function has(set, value) { return isSet(set) && set.items.some((x) => keyOf(x) === keyOf(value)); }
function subset(a, b) { return isSet(a) && isSet(b) && a.items.every((x) => has(b, x)); }
function properSubset(a, b) { return subset(a, b) && !sameSet(a, b); }
function sameSet(a, b) { return isSet(a) && isSet(b) && keyOf(a) === keyOf(b); }
function union(...sets) { return makeSet(sets.filter(isSet).flatMap((s) => s.items)); }
function intersectionMany(sets) {
  const clean = sets.filter(isSet);
  if (!clean.length) return makeSet([]);
  return clean.slice(1).reduce((acc, s) => intersection(acc, s), clean[0]);
}
function unionMany(sets) { return union(...sets); }
function intersection(a, b) { return makeSet(a.items.filter((x) => has(b, x))); }
function difference(a, b) { return makeSet(a.items.filter((x) => !has(b, x))); }
function symmetricDifference(a, b) { return union(difference(a, b), difference(b, a)); }
function complement(a, universal) { return difference(universal, a); }
function disjoint(a, b) { return intersection(a, b).items.length === 0; }

function parseNumericWindow(raw, errors = []) {
  const text = String(raw || '-10..10').trim() || '-10..10';
  let match = text.match(/^(-?\d+)\s*\.\.\s*(-?\d+)(?:\s+step\s+(-?\d+))?$/i);
  if (!match) match = text.match(/^range\s*\(\s*(-?\d+)\s*,\s*(-?\d+)(?:\s*,\s*(-?\d+))?\s*\)$/i);
  if (!match) {
    errors.push('Ventana numérica inválida. Usá -10..10, -10..10 step 2 o range(-10,10,2).');
    return parseNumericWindow('-10..10');
  }
  let start = Number(match[1]);
  let end = Number(match[2]);
  let step = Math.abs(Number(match[3] || 1)) || 1;
  if (start > end) [start, end] = [end, start];
  if ((end - start) / step > 1000) {
    errors.push('La ventana numérica es demasiado grande para graficar. La limito a 1001 valores.');
    end = start + step * 1000;
  }
  return { start, end, step, label: `[${start},${end}]${step !== 1 ? ` paso ${step}` : ''}` };
}

function expandDomain(domainName, numericWindow) {
  const name = String(domainName).trim().toUpperCase();
  if (name === 'R') {
    throw new Error('R es infinito no discreto; para graficar usá un rango discreto o un conjunto por extensión.');
  }
  const items = [];
  for (let x = numericWindow.start; x <= numericWindow.end; x += numericWindow.step) {
    if (name === 'N' && x < 1) continue;
    if (Number.isInteger(x)) items.push(makeAtom(x));
  }
  return makeSet(items);
}

function parseRangeSet(raw, numericWindow) {
  const text = String(raw).trim();
  const parsed = parseNumericWindow(text, []);
  if (!parsed) return null;
  const items = [];
  for (let x = parsed.start; x <= parsed.end; x += parsed.step) items.push(makeAtom(x));
  return makeSet(items);
}

function isDomainToken(raw) {
  return /^(Z|N|R)$/i.test(String(raw).trim());
}

function isRangeSyntax(raw) {
  return /^-?\d+\s*\.\.\s*-?\d+(?:\s+step\s+-?\d+)?$/i.test(String(raw).trim())
    || /^range\s*\(/i.test(String(raw).trim());
}

function isWrappedRangeSyntax(raw) {
  const text = String(raw).trim();
  return text.startsWith('{') && text.endsWith('}') && isRangeSyntax(text.slice(1, -1).trim());
}

function isSetBuilderSyntax(raw) {
  const text = String(raw || '').trim();
  return text.startsWith('{') && text.endsWith('}') && /[:|]/.test(text)
    && (/[∈]/.test(text) || /\bin\b/i.test(text) || /^\{\s*[A-Za-z_]\w*\s*[:|]/.test(text));
}

function parseSetBuilderNotation(raw) {
  const text = String(raw).trim();
  const inner = text.slice(1, -1).trim();
  let variable = 'x';
  let domainRaw = null;
  let condition = '';
  let match = inner.match(/^([A-Za-z_]\w*)\s*(?:[∈]|\bin\b)\s*(.+?)\s*[:|]\s*(.+)$/i);
  if (match) {
    variable = match[1];
    domainRaw = match[2].trim();
    condition = match[3].trim();
  } else {
    match = inner.match(/^([A-Za-z_]\w*)\s*[:|]\s*(.+)$/i);
    if (!match) throw new Error('No pude interpretar el conjunto por comprensión.');
    variable = match[1];
    condition = match[2].trim();
    const domainMatch = condition.match(new RegExp(`\\b${variable}\\s+in\\s+(.+?)\\s+(?:and|y|&&|[∧])\\s+(.+)$`, 'i'));
    if (!domainMatch) throw new Error('Indicá el dominio, por ejemplo {x in Z : x^2 >= 15}.');
    domainRaw = domainMatch[1].trim();
    condition = domainMatch[2].trim();
  }
  return { variable, domainRaw, condition };
}

function domainSetFromRaw(domainRaw, numericWindow) {
  const domain = String(domainRaw).trim();
  if (isDomainToken(domain)) return { set: expandDomain(domain, numericWindow), label: `${domain.toUpperCase()} evaluado en ${numericWindow.label}` };
  if (isRangeSyntax(domain)) return { set: parseRangeSet(domain, numericWindow), label: domain };
  if (isWrappedRangeSyntax(domain)) {
    const inner = domain.slice(1, -1).trim();
    return { set: parseRangeSet(inner, numericWindow), label: domain };
  }
  if (domain.startsWith('{')) {
    const set = parseLooseValue(domain);
    if (!isSet(set)) throw new Error('El dominio explícito debe ser un conjunto.');
    return { set, label: renderValue(set) };
  }
  throw new Error(`Dominio no soportado: ${domain}. Usá Z, N, un rango o un conjunto por extensión.`);
}

function normalizeMathCondition(condition, variable = 'x') {
  let expr = String(condition)
    .replace(/²/g, '**2').replace(/³/g, '**3')
    .replace(/\bmayor\s+o\s+igual\s+a\b/gi, '>=')
    .replace(/\bmenor\s+o\s+igual\s+a\b/gi, '<=')
    .replace(/\bmayor\s+que\b/gi, '>')
    .replace(/\bmenor\s+que\b/gi, '<')
    .replace(/\bigual\s+a\b/gi, '==')
    .replaceAll('≥', '>=')
    .replaceAll('≤', '<=')
    .replaceAll('∧', '&&')
    .replaceAll('∨', '||')
    .replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||')
    .replace(/\band\b/gi, '&&').replace(/\bor\b/gi, '||')
    .replace(/\by\b/gi, '&&').replace(/\bo\b/gi, '||')
    .replace(/\bnot\b/gi, '!')
    .replace(/\^/g, '**');
  expr = expr.replace(/(^|[^<>=!])=([^=])/g, '$1==$2');
  const identifiers = expr.match(/[A-Za-z_]\w*/g) || [];
  const allowed = new Set([variable, 'abs', 'sqrt', 'floor', 'ceil', 'round', 'pow', 'true', 'false']);
  for (const id of identifiers) {
    if (!allowed.has(id)) throw new Error(`Nombre no permitido en la condición: ${id}.`);
  }
  if (!/^[\d\sA-Za-z_+\-*/%().,<>=!&|*]+$/.test(expr)) {
    throw new Error('La condición tiene caracteres no permitidos.');
  }
  return expr;
}

function evaluateConditionForX(condition, x, variable = 'x') {
  const expr = normalizeMathCondition(condition, variable);
  const fn = new Function(variable, 'abs', 'sqrt', 'floor', 'ceil', 'round', 'pow', `"use strict"; return Boolean(${expr});`);
  return fn(x, Math.abs, Math.sqrt, Math.floor, Math.ceil, Math.round, Math.pow);
}

function makeSetFromBuilder(raw, numericWindow) {
  const parsed = parseSetBuilderNotation(raw);
  const domain = domainSetFromRaw(parsed.domainRaw, numericWindow);
  const items = domain.set.items.filter((item) => {
    if (!isAtom(item) || typeof item.value !== 'number') return false;
    return evaluateConditionForX(parsed.condition, item.value, parsed.variable);
  });
  return {
    set: makeSet(items),
    meta: {
      kind: 'builder',
      raw,
      domainLabel: domain.label,
      condition: parsed.condition
    }
  };
}

function powerSet(set, limit = 2048) {
  const n = set.items.length;
  const total = 2 ** n;
  const capped = Math.min(total, limit);
  const subsets = [];
  for (let mask = 0; mask < capped; mask++) {
    const items = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) items.push(set.items[i]);
    subsets.push(makeSet(items));
  }
  return { subsets, total, capped: capped < total };
}

function parseOptionalNamedSet(def, errors, warnings, numericWindow) {
  const raw = $(def.id).value.trim();
  if (!raw) return null;
  try {
    if (isSetBuilderSyntax(raw)) {
      const built = makeSetFromBuilder(raw, numericWindow);
      warnings.push(`${def.name} fue definido por comprensión. Se evaluó dentro de ${built.meta.domainLabel}.`);
      return { ...def, raw, set: built.set, meta: built.meta };
    }
    const v = parseLooseValue(raw);
    if (!isSet(v)) throw new SyntaxErrorSet(`${def.name} debe ser un conjunto: usá llaves, por ejemplo {1,2,3}.`);
    return { ...def, raw, set: v };
  } catch (err) {
    errors.push(`${def.name}: ${err.message}`);
    return { ...def, raw, set: makeSet([]), invalid: true };
  }
}

function parseUniversal(errors, warnings, numericWindow) {
  const raw = $('setU').value.trim();
  if (!raw) return null;
  try {
    if (isDomainToken(raw)) {
      const domain = raw.toUpperCase();
      const set = expandDomain(domain, numericWindow);
      const label = `${domain} evaluado en ${numericWindow.label}`;
      warnings.push(`U = ${domain} es infinito. Para graficar y listar se usa la ventana de evaluación ${numericWindow.label}.`);
      return { id: 'setU', name: 'U', raw, set, meta: { kind: 'domain', domain, label } };
    }
    if (isRangeSyntax(raw)) {
      const set = parseRangeSet(raw, numericWindow);
      return { id: 'setU', name: 'U', raw, set, meta: { kind: 'range', label: raw } };
    }
    if (isWrappedRangeSyntax(raw)) {
      const inner = raw.slice(1, -1).trim();
      const set = parseRangeSet(inner, numericWindow);
      return { id: 'setU', name: 'U', raw, set, meta: { kind: 'range', label: raw } };
    }
    const v = parseLooseValue(raw);
    if (!isSet(v)) throw new SyntaxErrorSet('U debe ser un conjunto: usá llaves, por ejemplo {1,2,3}.');
    return { id: 'setU', name: 'U', raw, set: v };
  } catch (err) {
    errors.push(`U: ${err.message}`);
    return { id: 'setU', name: 'U', raw, set: makeSet([]), invalid: true };
  }
}

function analyze() {
  const errors = [];
  const warnings = [];
  const numericWindow = parseNumericWindow($('numericWindow')?.value, errors);
  const activeSets = BASE_SET_DEFS
    .map((def) => parseOptionalNamedSet(def, errors, warnings, numericWindow))
    .filter(Boolean);

  const providedU = parseUniversal(errors, warnings, numericWindow);
  const autoU = unionMany(activeSets.map((s) => s.set));
  const U = providedU?.set || autoU;
  const universalWasAutomatic = !providedU;

  const named = Object.fromEntries(activeSets.map((s) => [s.name, s.set]));
  named.U = U;

  if (!activeSets.length) {
    warnings.push('No cargaste ningún conjunto activo. Escribí al menos A, B o C. Si querés analizar el vacío, escribí {} en A.');
  }

  if (universalWasAutomatic) {
    warnings.push('No cargaste U. Para poder calcular y dibujar, uso U = unión de los conjuntos activos. Eso sirve como referencia práctica, pero en teoría el universal debe fijarse antes.');
  }

  for (const item of activeSets) {
    const outside = difference(item.set, U);
    if (outside.items.length) {
      warnings.push(`${item.name} tiene elementos fuera de U: ${renderValue(outside)}. En teoría, A, B, C deben ser subconjuntos del universal elegido.`);
    }
  }

  let X = null;
  let xError = null;
  const rawX = $('queryX').value.trim();
  if (rawX) {
    try { X = parseLooseValue(rawX); }
    catch (err) { xError = err.message; errors.push(`X: ${err.message}`); }
  }

  const universalLabel = providedU?.meta?.label || (providedU ? renderValue(U) : `automático: ${renderValue(U)}`);
  lastState = { activeSets, U, providedU, universalWasAutomatic, X, named, warnings, errors, numericWindow, universalLabel };

  renderMessages(errors, warnings);
  renderParsedSets();
  renderQueryResults(X, xError);
  renderExpression();
  renderTheoryPanel();
  renderHighlightOptions();
  renderVenn();
  renderOperations();
  renderMembershipMatrix();
  renderRelations();
  renderPowerSets();
  renderPractice();
  $('statusBadge').textContent = errors.length ? 'Revisar sintaxis' : 'Analizado';
}

function renderMessages(errors, warnings) {
  $('errors').classList.toggle('hidden', !errors.length);
  $('warnings').classList.toggle('hidden', !warnings.length);
  $('errors').innerHTML = errors.map(escapeHtml).join('<br>');
  $('warnings').innerHTML = warnings.map(escapeHtml).join('<br>');
}

function renderParsedSets() {
  const { activeSets, U, providedU } = lastState;
  const host = $('parsedSets');
  const cards = activeSets.map(({ name, set, invalid }) => setCard(name, set, invalid ? 'con error de sintaxis' : 'activo'));
  cards.push(setCard('U', U, providedU ? 'universal cargado' : 'universal automático'));
  host.innerHTML = cards.join('');
}

function setCard(name, set, note) {
  return `
    <article class="set-card">
      <h3>${escapeHtml(name)} <span class="neutral-text">${escapeHtml(note)}</span></h3>
      <div class="set-value">${escapeHtml(renderValue(set))}</div>
      <div class="set-meta">
        <span>|${escapeHtml(name)}| = ${cardinal(set)}</span>
        <span>${set.items.length === 0 ? 'vacío' : 'finito'}</span>
      </div>
    </article>
  `;
}

function renderQueryResults(X, xError) {
  const { activeSets } = lastState;
  const host = $('queryResults');
  if (xError || !X || !activeSets.length) {
    host.innerHTML = '';
    return;
  }

  const rows = [];
  for (const { name, set } of activeSets) {
    const belongs = has(set, X);
    rows.push({
      formula: `${renderValue(X)} ∈ ${name}`,
      value: belongs,
      explain: belongs
        ? `${renderValue(X)} aparece como elemento directo de ${name}.`
        : `${renderValue(X)} no aparece como elemento directo de ${name}.`
    });

    if (isSet(X)) {
      const incl = subset(X, set);
      rows.push({
        formula: `${renderValue(X)} ⊆ ${name}`,
        value: incl,
        explain: incl
          ? `Cada elemento de ${renderValue(X)} pertenece a ${name}.`
          : `No todos los elementos de ${renderValue(X)} pertenecen a ${name}.`
      });
    } else {
      rows.push({
        formula: `${renderValue(X)} ⊆ ${name}`,
        value: null,
        explain: `No corresponde como inclusión: ${renderValue(X)} no está escrito como conjunto. Para probar inclusión usá {${renderValue(X)}} ⊆ ${name}.`
      });
    }
  }
  host.innerHTML = rows.map(truthCard).join('');
}

function truthCard(row) {
  return `
    <article class="truth-card ${row.value === true ? 'true' : row.value === false ? 'false' : ''}">
      <div class="formula">${escapeHtml(row.formula)}</div>
      <div class="truth-label">${row.value === true ? 'VERDADERO' : row.value === false ? 'FALSO' : 'NO CORRESPONDE'}</div>
      <div class="explain">${escapeHtml(row.explain)}</div>
    </article>
  `;
}

function renderExpression() {
  const expr = $('exprInput').value.trim();
  const host = $('expressionResult');
  const { named, U } = lastState;
  if (!expr) {
    host.className = 'expression-card';
    host.innerHTML = '<h3>Expresión</h3><p>Escribí una expresión para evaluarla. Ejemplo: <code>A ∩ (B ∪ C)</code>.</p>';
    return;
  }
  try {
    const result = new ExpressionParser(expr, named, U).parse();
    const isBool = typeof result === 'boolean';
    host.className = 'expression-card ok';
    host.innerHTML = `
      <h3>Expresión evaluada</h3>
      <div class="expr-line"><strong>${escapeHtml(expr)}</strong> = ${isBool ? boolText(result) : escapeHtml(renderValue(result))}</div>
      <p>${isBool ? 'Proposición lógica.' : `Cardinal: ${result.items.length}`}</p>
    `;
  } catch (err) {
    host.className = 'expression-card bad';
    host.innerHTML = `<h3>Error en expresión</h3><div>${escapeHtml(err.message)}</div>`;
  }
}

class ExpressionParser {
  constructor(text, named, universal, context = lastState) {
    this.tokens = tokenizeExpression(text, context);
    this.i = 0;
    this.named = named;
    this.universal = universal;
  }

  parse() {
    const value = this.parseRelation();
    if (this.peek()) throw new Error(`Token inesperado: ${this.peek().raw}`);
    return value;
  }

  parseRelation() {
    let left = this.parseUnion();
    if (this.match('subset') || this.match('notsubset') || this.match('belongs') || this.match('notbelongs') || this.match('equals')) {
      const op = this.previous().type;
      const right = this.parseUnion();
      if (op === 'subset' || op === 'notsubset') {
        if (!isSet(left) || !isSet(right)) throw new Error('La inclusión ⊆ compara conjunto con conjunto.');
        const val = subset(left, right);
        return op === 'subset' ? val : !val;
      }
      if (op === 'equals') {
        if (!isSet(left) || !isSet(right)) throw new Error('La igualdad de conjuntos compara conjunto con conjunto.');
        return sameSet(left, right);
      }
      if (!isSet(right)) throw new Error('La pertenencia ∈ debe tener un conjunto a la derecha.');
      const val = has(right, left);
      return op === 'belongs' ? val : !val;
    }
    return left;
  }

  parseUnion() {
    let left = this.parseIntersection();
    while (this.match('union') || this.match('sym')) {
      const op = this.previous().type;
      const right = this.parseIntersection();
      assertSets(left, right, op);
      left = op === 'union' ? union(left, right) : symmetricDifference(left, right);
    }
    return left;
  }

  parseIntersection() {
    let left = this.parsePostfix();
    while (this.match('inter') || this.match('diff')) {
      const op = this.previous().type;
      const right = this.parsePostfix();
      assertSets(left, right, op);
      left = op === 'inter' ? intersection(left, right) : difference(left, right);
    }
    return left;
  }

  parsePostfix() {
    let value = this.parsePrimary();
    while (this.match('comp')) {
      if (!isSet(value)) throw new Error('Solo se puede complementar un conjunto.');
      value = complement(value, this.universal);
    }
    return value;
  }

  parsePrimary() {
    if (this.match('name')) {
      const raw = this.previous().raw;
      if (raw === 'P') {
        this.consume('lparen', 'Después de P debe venir (, por ejemplo P(A).');
        const inner = this.parseUnion();
        this.consume('rparen', 'Falta cerrar P(...).');
        if (!isSet(inner)) throw new Error('P(...) necesita un conjunto.');
        if (inner.items.length > 10) throw new Error('P(...) limitado a conjuntos de hasta 10 elementos en la expresión. Usá el panel de conjunto de partes para vista parcial.');
        return makeSet(powerSet(inner, 2048).subsets);
      }
      const name = raw.toUpperCase();
      if (!this.named[name]) throw new Error(`No existe el conjunto ${raw}. Cargalo primero o dejá de usarlo en la expresión.`);
      return this.named[name];
    }
    if (this.match('empty')) return makeSet([]);
    if (this.match('literal')) return this.previous().value;
    if (this.match('atom')) return this.previous().value;
    if (this.match('lparen')) {
      const value = this.parseRelation();
      this.consume('rparen', 'Falta cerrar paréntesis.');
      return value;
    }
    throw new Error(`Esperaba conjunto, variable o paréntesis y encontré: ${this.peek()?.raw ?? 'fin'}`);
  }

  match(type) { if (this.peek()?.type === type) { this.i++; return true; } return false; }
  consume(type, message) { if (this.match(type)) return this.previous(); throw new Error(message); }
  peek() { return this.tokens[this.i]; }
  previous() { return this.tokens[this.i - 1]; }
}

function assertSets(left, right, op) {
  if (!isSet(left) || !isSet(right)) throw new Error(`La operación ${op} necesita conjuntos a ambos lados.`);
}

function tokenizeExpression(text, context = lastState) {
  const tokens = [];
  let i = 0;
  const source = String(text);
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '(') { tokens.push({ type: 'lparen', raw: ch }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen', raw: ch }); i++; continue; }
    if (ch === '∪' || ch === '|') { tokens.push({ type: 'union', raw: ch }); i++; continue; }
    if (ch === '∩' || ch === '&') { tokens.push({ type: 'inter', raw: ch }); i++; continue; }
    if (ch === '-' || ch === '\\') { tokens.push({ type: 'diff', raw: ch }); i++; continue; }
    if (ch === '△' || ch === 'Δ') { tokens.push({ type: 'sym', raw: ch }); i++; continue; }
    if (ch === '∈') { tokens.push({ type: 'belongs', raw: ch }); i++; continue; }
    if (ch === '∉') { tokens.push({ type: 'notbelongs', raw: '∉' }); i++; continue; }
    if (ch === '⊆' || ch === '⊂') { tokens.push({ type: 'subset', raw: ch }); i++; continue; }
    if (ch === '⊈') { tokens.push({ type: 'notsubset', raw: ch }); i++; continue; }
    if (ch === '=') { tokens.push({ type: 'equals', raw: ch }); i++; continue; }
    if (ch === "'" || ch === 'ᶜ') { tokens.push({ type: 'comp', raw: ch }); i++; continue; }
    if (ch === '^') {
      if (source[i + 1]?.toLowerCase() === 'c') { tokens.push({ type: 'comp', raw: '^c' }); i += 2; continue; }
      tokens.push({ type: 'sym', raw: ch }); i++; continue;
    }
    if (ch === '∅' || ch === 'Ø' || ch === ';') { tokens.push({ type: 'empty', raw: ch }); i++; continue; }
    if (ch === '{') {
      const end = findBalancedSet(source, i);
      const raw = source.slice(i, end + 1);
      const value = isSetBuilderSyntax(raw)
        ? makeSetFromBuilder(raw, context?.numericWindow || parseNumericWindow('-10..10')).set
        : parseLooseValue(raw);
      tokens.push({ type: 'literal', raw, value });
      i = end + 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const parser = new SetSyntaxParser(source.slice(i));
      const value = parser.readValue();
      tokens.push({ type: 'atom', raw: renderValue(value), value });
      i += parser.i;
      continue;
    }
    const start = i;
    while (i < source.length && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ_0-9,.]/.test(source[i])) i++;
    if (start !== i) {
      const word = source.slice(start, i);
      const low = word.toLowerCase();
      if (/^[ABCPU]$/i.test(word)) tokens.push({ type: 'name', raw: word.trim().toUpperCase() });
      else if (['union', 'unión'].includes(low)) tokens.push({ type: 'union', raw: word });
      else if (['inter', 'interseccion', 'intersección'].includes(low)) tokens.push({ type: 'inter', raw: word });
      else if (['diff', 'diferencia'].includes(low)) tokens.push({ type: 'diff', raw: word });
      else if (['sym', 'simetrica', 'simétrica'].includes(low)) tokens.push({ type: 'sym', raw: word });
      else if (['comp', 'complemento'].includes(low)) tokens.push({ type: 'comp', raw: word });
      else if (/^-?\d+(?:[\.,]\d+)?$/.test(word)) tokens.push({ type: 'atom', raw: word, value: makeAtom(Number(word.replace(',', '.'))) });
      else tokens.push({ type: 'atom', raw: word, value: makeAtom(word) });
      continue;
    }
    throw new Error(`Carácter no reconocido en expresión: ${ch}`);
  }
  return tokens;
}

function findBalancedSet(text, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) return i;
  }
  throw new Error('Falta cerrar una llave en la expresión.');
}

function renderTheoryPanel() {
  const { activeSets, X, U, universalWasAutomatic } = lastState;
  const cards = [];
  if (!activeSets.length) {
    $('theoryPanel').innerHTML = emptyPanel('Cargá al menos un conjunto para generar teoría aplicada.');
    return;
  }

  const first = activeSets[0];
  cards.push(theoryCard(
    'Pertenencia ≠ inclusión',
    X
      ? `Con X = ${renderValue(X)}, la app prueba ${renderValue(X)} ∈ ${first.name} como elemento directo. Si X es conjunto, también prueba ${renderValue(X)} ⊆ ${first.name}.`
      : `La pertenencia compara un objeto con ${first.name}; la inclusión compara un conjunto con ${first.name}.`,
    'neutral'
  ));

  const empty = makeSet([]);
  cards.push(theoryCard(
    'Vacío',
    `∅ ⊆ ${first.name} es ${subset(empty, first.set) ? 'verdadero' : 'falso'}; ∅ ∈ ${first.name} es ${has(first.set, empty) ? 'verdadero' : 'falso'}. No son la misma frase.`,
    subset(empty, first.set) ? 'true' : 'false'
  ));

  cards.push(theoryCard(
    'Universal',
    universalWasAutomatic
      ? `U se generó automáticamente como ${renderValue(U)}. Para complementos formales conviene cargar U a mano.`
      : `U está cargado como ${renderValue(U)}. Todo complemento se calcula dentro de ese universal.`,
    universalWasAutomatic ? 'false' : 'true'
  ));

  if (activeSets.length >= 2) {
    const [s1, s2] = activeSets;
    cards.push(theoryCard(
      'Igualdad por doble inclusión',
      `${s1.name} = ${s2.name} equivale a ${s1.name} ⊆ ${s2.name} y ${s2.name} ⊆ ${s1.name}. Resultado: ${sameSet(s1.set, s2.set) ? 'verdadero' : 'falso'}.`,
      sameSet(s1.set, s2.set) ? 'true' : 'false'
    ));
  }

  $('theoryPanel').innerHTML = cards.join('');
}

function theoryCard(title, body, kind = 'neutral') {
  const cls = kind === 'true' ? 'true' : kind === 'false' ? 'false' : '';
  return `<article class="practice-card ${cls}"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`;
}

function legacyRenderHighlightOptions() {
  const { activeSets } = lastState;
  const select = $('highlightSelect');
  const old = select.value || 'none';
  const options = [['none', 'Sin resaltar']];

  for (let i = 0; i < activeSets.length; i++) {
    options.push([`set:${i}`, activeSets[i].name]);
    options.push([`comp:${i}`, `${activeSets[i].name}ᶜ`]);
  }
  if (activeSets.length >= 2) {
    const a = activeSets[0].name;
    const b = activeSets[1].name;
    options.push(['pair:union:0:1', `${a} ∪ ${b}`]);
    options.push(['pair:inter:0:1', `${a} ∩ ${b}`]);
    options.push(['pair:diff:0:1', `${a} − ${b}`]);
    options.push(['pair:diff:1:0', `${b} − ${a}`]);
    options.push(['pair:sym:0:1', `${a} △ ${b}`]);
  }
  if (activeSets.length === 3) {
    options.push(['all:union', `${namesJoin(activeSets, ' ∪ ')}`]);
    options.push(['all:inter', `${namesJoin(activeSets, ' ∩ ')}`]);
  }

  select.innerHTML = options.map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join('');
  select.value = options.some((o) => o[0] === old) ? old : 'none';
}

function selectedSignatures(mode, activeSets) {
  const n = activeSets.length;
  const all = allSignatures(n);
  if (mode === 'none') return new Set();
  if (mode.startsWith('set:')) {
    const idx = Number(mode.split(':')[1]);
    return new Set(all.filter((s) => s[idx] === '1'));
  }
  if (mode.startsWith('comp:')) {
    const idx = Number(mode.split(':')[1]);
    return new Set(all.filter((s) => s[idx] === '0'));
  }
  if (mode.startsWith('pair:')) {
    const [, op, iRaw, jRaw] = mode.split(':');
    const i = Number(iRaw), j = Number(jRaw);
    return new Set(all.filter((s) => {
      const a = s[i] === '1', b = s[j] === '1';
      if (op === 'union') return a || b;
      if (op === 'inter') return a && b;
      if (op === 'diff') return a && !b;
      if (op === 'sym') return a !== b;
      return false;
    }));
  }
  if (mode === 'all:union') return new Set(all.filter((s) => s.includes('1')));
  if (mode === 'all:inter') return new Set(all.filter((s) => /^1+$/.test(s)));
  return new Set();
}

function renderHighlightOptions() {
  const { activeSets } = lastState;
  const select = $('highlightSelect');
  const old = select.value || '';
  const options = buildVennQueryOptions(activeSets);
  select.innerHTML = options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
  select.value = options.some((o) => o[0] === old) ? old : (options[0]?.[0] || '');
}

function buildVennQueryOptions(activeSets) {
  if (!activeSets.length) return [['', 'Sin conjuntos']];
  const names = activeSets.map((s) => s.name);
  const options = [];
  for (const name of names) {
    options.push([name, name]);
    options.push([`${name}^c`, `${name}^c`]);
  }
  const pairs = activeSets.length === 3 ? [[0, 1], [0, 2], [1, 2]] : activeSets.length === 2 ? [[0, 1]] : [];
  for (const [i, j] of pairs) {
    const a = names[i], b = names[j];
    options.push([`${a} ∪ ${b}`, `${a} ∪ ${b}`]);
    options.push([`${a} ∩ ${b}`, `${a} ∩ ${b}`]);
    options.push([`${a} - ${b}`, `${a} - ${b}`]);
    options.push([`${b} - ${a}`, `${b} - ${a}`]);
    options.push([`${a} △ ${b}`, `${a} △ ${b}`]);
  }
  if (activeSets.length >= 2) {
    const unionExpr = names.join(' ∪ ');
    const interExpr = names.join(' ∩ ');
    options.push([unionExpr, unionExpr]);
    options.push([interExpr, interExpr]);
    options.push([`(${unionExpr})^c`, `(${unionExpr})^c`]);
    options.push([`(${interExpr})^c`, `(${interExpr})^c`]);
  }
  options.push(['U', 'U']);
  options.push(['∅', '∅']);
  const unique = [];
  const seen = new Set();
  for (const option of options) {
    if (!seen.has(option[0])) { seen.add(option[0]); unique.push(option); }
  }
  return unique;
}

function allSignatures(n) {
  const total = 2 ** n;
  const out = [];
  for (let mask = total - 1; mask >= 0; mask--) {
    let sig = '';
    for (let i = 0; i < n; i++) sig += (mask & (1 << (n - 1 - i))) ? '1' : '0';
    out.push(sig);
  }
  return out;
}

function getRegions(activeSets, U) {
  const domain = union(U, ...activeSets.map((s) => s.set));
  const signatures = allSignatures(activeSets.length);
  const bins = new Map(signatures.map((sig) => [sig, []]));
  if (!activeSets.length) return {};
  for (const item of domain.items) {
    const sig = activeSets.map((s) => has(s.set, item) ? '1' : '0').join('');
    bins.get(sig)?.push(item);
  }
  return Object.fromEntries(Array.from(bins.entries()).map(([k, items]) => [k, makeSet(items)]));
}

function legacyRenderVenn() {
  const { activeSets, U } = lastState;
  const mode = $('highlightSelect').value || 'none';
  const highlighted = selectedSignatures(mode, activeSets);

  if (!activeSets.length) {
    $('vennSvg').innerHTML = buildEmptyVennSvg('Cargá al menos un conjunto');
    $('vennLegend').innerHTML = '';
    syncVennModal();
    return;
  }

  const regions = getRegions(activeSets, U);
  $('vennSvg').innerHTML = buildVennSvg(activeSets, highlighted, regions);

  const signatures = allSignatures(activeSets.length);
  $('vennLegend').innerHTML = signatures.map((sig, idx) => `
    <article class="region-card ${highlighted.has(sig) ? 'highlighted' : ''}" style="border-left-color:${COLORS[idx % COLORS.length]}">
      <h3>${escapeHtml(regionName(sig, activeSets))}</h3>
      <div class="items">${escapeHtml(renderValue(regions[sig]))}</div>
    </article>
  `).join('');
  syncVennModal();
}

function legacyBuildVennSvg(activeSets, highlighted, regions = {}) {
  const count = activeSets.length;
  const label = $('highlightSelect').selectedOptions[0]?.textContent || '';
  const regionHighlights = renderSvgRegionHighlights(count, highlighted);
  const regionItems = renderSvgRegionItems(regions, highlighted, count);
  if (count === 1) {
    const a = activeSets[0].name;
    return `<svg viewBox="0 0 720 430" role="img" aria-label="Diagrama de Venn de un conjunto">
      <rect x="28" y="28" width="664" height="374" rx="16" fill="#ffffff" stroke="#e8eaed" stroke-width="1.5"/>
      <circle cx="360" cy="215" r="130" fill="${COLORS[0]}" opacity="${highlighted.size ? (highlighted.has('1') ? 0.42 : 0.12) : 0.32}" stroke="#1a73e8" stroke-width="3" class="venn-circle"/>
      ${regionHighlights}
      <text x="360" y="176" text-anchor="middle" class="venn-label">${escapeSvg(a)}</text>
      ${regionItems}
      <text x="360" y="372" text-anchor="middle" class="venn-subtext">${escapeSvg(label)}</text>
      <text x="52" y="62" class="venn-subtext">U</text>
    </svg>`;
  }
  if (count === 2) {
    const [a, b] = activeSets.map((s) => s.name);
    return `<svg viewBox="0 0 720 430" role="img" aria-label="Diagrama de Venn de dos conjuntos">
      <rect x="28" y="28" width="664" height="374" rx="16" fill="#ffffff" stroke="#e8eaed" stroke-width="1.5"/>
      <circle cx="300" cy="215" r="135" fill="${COLORS[0]}" opacity="0.34" stroke="#1a73e8" stroke-width="3" class="venn-circle"/>
      <circle cx="420" cy="215" r="135" fill="${COLORS[1]}" opacity="0.32" stroke="#c5221f" stroke-width="3" class="venn-circle"/>
      ${regionHighlights}
      <text x="238" y="166" text-anchor="middle" class="venn-label">${escapeSvg(a)}</text>
      <text x="482" y="166" text-anchor="middle" class="venn-label">${escapeSvg(b)}</text>
      ${regionItems}
      <text x="360" y="372" text-anchor="middle" class="venn-subtext">${escapeSvg(label)}</text>
      <text x="52" y="62" class="venn-subtext">U</text>
    </svg>`;
  }
  const [a, b, c] = activeSets.map((s) => s.name);
  return `<svg viewBox="0 0 720 430" role="img" aria-label="Diagrama de Venn de tres conjuntos">
    <rect x="28" y="28" width="664" height="374" rx="16" fill="#ffffff" stroke="#e8eaed" stroke-width="1.5"/>
    <circle cx="295" cy="190" r="128" fill="${COLORS[0]}" opacity="0.32" stroke="#1a73e8" stroke-width="3" class="venn-circle"/>
    <circle cx="425" cy="190" r="128" fill="${COLORS[1]}" opacity="0.30" stroke="#c5221f" stroke-width="3" class="venn-circle"/>
    <circle cx="360" cy="290" r="128" fill="${COLORS[2]}" opacity="0.34" stroke="#f29900" stroke-width="3" class="venn-circle"/>
    ${regionHighlights}
    <text x="240" y="126" text-anchor="middle" class="venn-label">${escapeSvg(a)}</text>
    <text x="480" y="126" text-anchor="middle" class="venn-label">${escapeSvg(b)}</text>
    <text x="360" y="382" text-anchor="middle" class="venn-label">${escapeSvg(c)}</text>
    ${regionItems}
    <text x="360" y="394" text-anchor="middle" class="venn-subtext">${escapeSvg(label)}</text>
    <text x="52" y="62" class="venn-subtext">U</text>
  </svg>`;
}

function getRegionAnchorPoints(count) {
  if (count === 1) {
    return {
      '1': { x: 360, y: 220, maxWidth: 78, maxChars: 10, cols: 3, colGap: 82, rowGap: 25 },
      '0': { x: 150, y: 148, maxWidth: 78, maxChars: 10, cols: 2, colGap: 82, rowGap: 25 }
    };
  }
  if (count === 2) {
    return {
      '10': { x: 238, y: 224, maxWidth: 72, maxChars: 9, cols: 2, colGap: 74, rowGap: 24 },
      '11': { x: 360, y: 224, maxWidth: 70, maxChars: 9, cols: 1, colGap: 72, rowGap: 24 },
      '01': { x: 482, y: 224, maxWidth: 72, maxChars: 9, cols: 2, colGap: 74, rowGap: 24 },
      '00': { x: 132, y: 126, maxWidth: 78, maxChars: 10, cols: 2, colGap: 82, rowGap: 24 }
    };
  }
  return {
    '100': { x: 248, y: 195, maxWidth: 68, maxChars: 8, cols: 1, colGap: 70, rowGap: 23 },
    '010': { x: 472, y: 195, maxWidth: 68, maxChars: 8, cols: 1, colGap: 70, rowGap: 23 },
    '001': { x: 360, y: 330, maxWidth: 68, maxChars: 8, cols: 2, colGap: 72, rowGap: 23 },
    '110': { x: 360, y: 160, maxWidth: 68, maxChars: 8, cols: 2, colGap: 72, rowGap: 23 },
    '101': { x: 304, y: 272, maxWidth: 66, maxChars: 8, cols: 1, colGap: 68, rowGap: 23 },
    '011': { x: 416, y: 272, maxWidth: 66, maxChars: 8, cols: 1, colGap: 68, rowGap: 23 },
    '111': { x: 360, y: 236, maxWidth: 66, maxChars: 8, cols: 1, colGap: 68, rowGap: 23 },
    '000': { x: 130, y: 112, maxWidth: 78, maxChars: 10, cols: 2, colGap: 82, rowGap: 23 }
  };
}

function renderSvgRegionHighlights(count, highlighted) {
  if (!highlighted.size) return '';
  const anchors = getRegionAnchorPoints(count);
  return Array.from(highlighted).map((sig) => {
    const anchor = anchors[sig];
    if (!anchor) return '';
    const cols = anchor.cols || 1;
    const width = Math.max(anchor.maxWidth + 30, cols * (anchor.colGap || 74));
    return `<ellipse class="venn-region-shade" cx="${anchor.x}" cy="${anchor.y}" rx="${width / 2}" ry="48"/>`;
  }).join('');
}

function legacyRenderSvgRegionItems(regions, highlighted, count) {
  const anchors = getRegionAnchorPoints(count);
  return allSignatures(count).map((sig) => {
    const anchor = anchors[sig];
    if (!anchor) return '';
    const items = regions[sig]?.items || [];
    const visible = truncateRegionItems(items, count === 1 ? 9 : count === 2 ? 8 : 6, anchor.maxChars);
    const totalRows = visible.items.length + (visible.more ? 1 : 0);
    if (!totalRows) return '';
    const dimmed = highlighted.size && !highlighted.has(sig);
    const emphasized = highlighted.size && highlighted.has(sig);
    const startY = anchor.y - ((totalRows - 1) * 24) / 2;
    const rows = visible.items.map((label, idx) => renderSvgItemPill(label, anchor, startY + idx * 24));
    if (visible.more) {
      rows.push(`<text x="${anchor.x}" y="${startY + visible.items.length * 24}" text-anchor="middle" class="venn-more-text">+${visible.more} m&#225;s</text>`);
    }
    return `<g class="venn-item-group ${dimmed ? 'dimmed' : ''} ${emphasized ? 'emphasized' : ''}">${rows.join('')}</g>`;
  }).join('');
}

function truncateRegionItems(items, limit, maxChars) {
  return {
    items: items.slice(0, limit).map((item) => truncateText(renderValue(item), maxChars)),
    more: Math.max(0, items.length - limit)
  };
}

function truncateText(text, maxChars) {
  const value = String(text);
  return value.length > maxChars ? `${value.slice(0, Math.max(1, maxChars - 3))}...` : value;
}

function legacyRenderSvgItemPill(label, anchor, y) {
  const width = Math.min(anchor.maxWidth, Math.max(38, label.length * 7 + 18));
  const x = anchor.x - width / 2;
  return `<g>
    <rect class="venn-item-pill" x="${x}" y="${y - 10}" width="${width}" height="20" rx="10"/>
    <text class="venn-item-text" x="${anchor.x}" y="${y}" text-anchor="middle">${escapeSvg(label)}</text>
  </g>`;
}

function getCurrentVennExpression() {
  return vennCustomExpression || $('highlightSelect').value || '';
}

function evaluateVennQuery(expr) {
  const expression = String(expr || '').trim();
  if (!expression) return { expression: '∅', result: makeSet([]), ok: true };
  try {
    const result = new ExpressionParser(expression, lastState.named, lastState.U, lastState).parse();
    if (!isSet(result)) throw new Error('La expresión del diagrama debe dar como resultado un conjunto.');
    return { expression, result, ok: true };
  } catch (err) {
    return { expression, result: makeSet([]), ok: false, error: err.message };
  }
}

function selectedSignaturesForResult(result, regions) {
  const out = new Set();
  if (!isSet(result)) return out;
  for (const [sig, set] of Object.entries(regions)) {
    if (set.items.some((item) => has(result, item))) out.add(sig);
  }
  return out;
}

function renderVennResultPanel(resultInfo) {
  const host = $('vennResultPanel');
  if (!resultInfo.ok) {
    host.innerHTML = `<h3>Resultado mostrado</h3><p class="false-text">${escapeHtml(resultInfo.error)}</p>`;
    return;
  }
  host.innerHTML = `
    <h3>Resultado mostrado</h3>
    <p><strong>Expresión elegida:</strong> ${escapeHtml(resultInfo.expression)}</p>
    <p><strong>Resultado:</strong></p>
    <div class="items">${escapeHtml(renderValue(resultInfo.result))}</div>
    <p><strong>Cardinal:</strong> ${resultInfo.result.items.length}</p>
    <p><strong>Universal usado:</strong> ${escapeHtml(lastState.universalLabel)}</p>
  `;
}

function renderVenn() {
  const { activeSets, U } = lastState;
  if (!activeSets.length) {
    $('vennSvg').innerHTML = buildEmptyVennSvg('Cargá al menos un conjunto');
    $('vennLegend').innerHTML = '';
    $('vennResultPanel').innerHTML = '';
    syncVennModal();
    return;
  }
  const regions = getRegions(activeSets, U);
  const resultInfo = evaluateVennQuery(getCurrentVennExpression());
  const highlighted = selectedSignaturesForResult(resultInfo.result, regions);
  $('vennSvg').innerHTML = buildVennSvg(activeSets, highlighted, regions, resultInfo);
  renderVennResultPanel(resultInfo);
  const signatures = allSignatures(activeSets.length);
  $('vennLegend').innerHTML = signatures.map((sig, idx) => `
    <article class="region-card ${highlighted.has(sig) ? 'highlighted' : ''}" style="border-left-color:${COLORS[idx % COLORS.length]}">
      <h3>${escapeHtml(regionName(sig, activeSets))}</h3>
      <div class="items">${escapeHtml(renderValue(regions[sig]))}</div>
    </article>
  `).join('');
  syncVennModal();
}

function buildVennSvg(activeSets, highlighted, regions = {}, resultInfo = null) {
  const count = activeSets.length;
  const label = resultInfo?.expression || $('highlightSelect').selectedOptions[0]?.textContent || '';
  const regionHighlights = renderSvgRegionHighlights(count, highlighted);
  const regionItems = renderSvgRegionItems(regions, highlighted, count, resultInfo?.result || null);
  if (count === 1) {
    const a = activeSets[0].name;
    return `<svg viewBox="0 0 720 430" role="img" aria-label="Diagrama de Venn de un conjunto">
      <rect x="28" y="28" width="664" height="374" rx="16" fill="#ffffff" stroke="#dadce0" stroke-width="2"/>
      <circle cx="360" cy="215" r="130" fill="${COLORS[0]}" opacity="${highlighted.size ? (highlighted.has('1') ? 0.42 : 0.12) : 0.32}" stroke="#1a73e8" stroke-width="3" class="venn-circle"/>
      ${regionHighlights}
      <text x="360" y="176" text-anchor="middle" class="venn-label">${escapeSvg(a)}</text>
      ${regionItems}
      <text x="360" y="372" text-anchor="middle" class="venn-subtext">${escapeSvg(label)}</text>
      <text x="52" y="62" class="venn-subtext">U</text>
    </svg>`;
  }
  if (count === 2) {
    const [a, b] = activeSets.map((s) => s.name);
    return `<svg viewBox="0 0 720 430" role="img" aria-label="Diagrama de Venn de dos conjuntos">
      <rect x="28" y="28" width="664" height="374" rx="16" fill="#ffffff" stroke="#dadce0" stroke-width="2"/>
      <circle cx="300" cy="215" r="135" fill="${COLORS[0]}" opacity="0.34" stroke="#1a73e8" stroke-width="3" class="venn-circle"/>
      <circle cx="420" cy="215" r="135" fill="${COLORS[1]}" opacity="0.32" stroke="#c5221f" stroke-width="3" class="venn-circle"/>
      ${regionHighlights}
      <text x="238" y="166" text-anchor="middle" class="venn-label">${escapeSvg(a)}</text>
      <text x="482" y="166" text-anchor="middle" class="venn-label">${escapeSvg(b)}</text>
      ${regionItems}
      <text x="360" y="372" text-anchor="middle" class="venn-subtext">${escapeSvg(label)}</text>
      <text x="52" y="62" class="venn-subtext">U</text>
    </svg>`;
  }
  const [a, b, c] = activeSets.map((s) => s.name);
  return `<svg viewBox="0 0 720 430" role="img" aria-label="Diagrama de Venn de tres conjuntos">
    <rect x="28" y="28" width="664" height="374" rx="16" fill="#ffffff" stroke="#e8eaed" stroke-width="1.5"/>
    <circle cx="295" cy="190" r="128" fill="${COLORS[0]}" opacity="0.32" stroke="#1a73e8" stroke-width="3" class="venn-circle"/>
    <circle cx="425" cy="190" r="128" fill="${COLORS[1]}" opacity="0.30" stroke="#c5221f" stroke-width="3" class="venn-circle"/>
    <circle cx="360" cy="290" r="128" fill="${COLORS[2]}" opacity="0.34" stroke="#f29900" stroke-width="3" class="venn-circle"/>
    ${regionHighlights}
    <text x="240" y="126" text-anchor="middle" class="venn-label">${escapeSvg(a)}</text>
    <text x="480" y="126" text-anchor="middle" class="venn-label">${escapeSvg(b)}</text>
    <text x="360" y="382" text-anchor="middle" class="venn-label">${escapeSvg(c)}</text>
    ${regionItems}
    <text x="360" y="394" text-anchor="middle" class="venn-subtext">${escapeSvg(label)}</text>
    <text x="52" y="62" class="venn-subtext">U</text>
  </svg>`;
}

function renderSvgRegionItems(regions, highlighted, count, resultSet = null) {
  const anchors = getRegionAnchorPoints(count);
  return allSignatures(count).map((sig) => {
    const anchor = anchors[sig];
    if (!anchor) return '';
    const items = regions[sig]?.items || [];
    const visible = truncateRegionItems(items, count === 1 ? 9 : count === 2 ? 8 : 6, anchor.maxChars);
    const totalRows = visible.items.length + (visible.more ? 1 : 0);
    if (!totalRows) return '';
    const points = distributeItemsInRegion(totalRows, anchor);
    const rows = visible.items.map((label, idx) => {
      const item = items[idx];
      const isHit = resultSet && has(resultSet, item);
      const isDim = resultSet && !isHit;
      return renderSvgItemPill(label, { ...anchor, ...points[idx] }, isHit, isDim);
    });
    if (visible.more) {
      const point = points[visible.items.length];
      rows.push(`<text x="${point.x}" y="${point.y}" text-anchor="middle" class="venn-more-text">+${visible.more} más</text>`);
    }
    return `<g class="venn-item-group">${rows.join('')}</g>`;
  }).join('');
}

function distributeItemsInRegion(total, anchor) {
  const cols = Math.max(1, Math.min(anchor.cols || 1, total));
  const rows = Math.ceil(total / cols);
  const colGap = anchor.colGap || 74;
  const rowGap = anchor.rowGap || 24;
  const out = [];
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const countInRow = Math.min(cols, total - row * cols);
    const rowWidth = (countInRow - 1) * colGap;
    out.push({
      x: anchor.x - rowWidth / 2 + col * colGap,
      y: anchor.y - ((rows - 1) * rowGap) / 2 + row * rowGap
    });
  }
  return out;
}

function renderSvgItemPill(label, anchor, highlighted = false, dimmed = false) {
  const width = Math.min(anchor.maxWidth, Math.max(40, label.length * 7 + 18));
  const x = anchor.x - width / 2;
  return `<g>
    <rect class="venn-item-pill ${highlighted ? 'highlighted' : ''} ${dimmed ? 'dimmed' : ''}" x="${x}" y="${anchor.y - 10}" width="${width}" height="20" rx="10"/>
    <text class="venn-item-text ${dimmed ? 'dimmed' : ''}" x="${anchor.x}" y="${anchor.y}" text-anchor="middle">${escapeSvg(label)}</text>
  </g>`;
}

function buildEmptyVennSvg(text) {
  return `<svg viewBox="0 0 720 430" role="img" aria-label="Diagrama vacío">
    <rect x="28" y="28" width="664" height="374" rx="16" fill="#ffffff" stroke="#dadce0" stroke-width="2"/>
    <text x="360" y="215" text-anchor="middle" class="venn-label">${escapeSvg(text)}</text>
  </svg>`;
}

function renderOperations() {
  const { activeSets, U } = lastState;
  if (!activeSets.length) {
    $('operationsTable').innerHTML = emptyPanel('No hay operaciones para mostrar.');
    return;
  }

  const rows = [];
  for (const { name, set } of activeSets) {
    rows.push([`${name}ᶜ`, `Complemento de ${name} dentro de U.`, complement(set, U)]);
    rows.push([`${name} ∪ ∅`, `Unir con vacío no agrega elementos.`, union(set, makeSet([]))]);
    rows.push([`${name} ∩ ∅`, `Intersectar con vacío da vacío.`, intersection(set, makeSet([]))]);
    rows.push([`${name} ∪ U`, `Unir con universal da U.`, union(set, U)]);
    rows.push([`${name} ∩ U`, `Intersectar con universal deja ${name}.`, intersection(set, U)]);
    rows.push([`${name} ∩ ${name}ᶜ`, `Un conjunto y su complemento no comparten elementos.`, intersection(set, complement(set, U))]);
    rows.push([`${name} ∪ ${name}ᶜ`, `Un conjunto más todo lo que le falta da U.`, union(set, complement(set, U))]);
  }

  for (let i = 0; i < activeSets.length; i++) {
    for (let j = i + 1; j < activeSets.length; j++) {
      const s1 = activeSets[i], s2 = activeSets[j];
      rows.push([`${s1.name} ∪ ${s2.name}`, `Unión: está en ${s1.name}, en ${s2.name} o en ambos.`, union(s1.set, s2.set)]);
      rows.push([`${s1.name} ∩ ${s2.name}`, `Intersección: elementos comunes entre ${s1.name} y ${s2.name}.`, intersection(s1.set, s2.set)]);
      rows.push([`${s1.name} − ${s2.name}`, `Elementos de ${s1.name} que no están en ${s2.name}.`, difference(s1.set, s2.set)]);
      rows.push([`${s2.name} − ${s1.name}`, `Elementos de ${s2.name} que no están en ${s1.name}.`, difference(s2.set, s1.set)]);
      rows.push([`${s1.name} △ ${s2.name}`, `Diferencia simétrica: están en uno u otro, pero no en ambos.`, symmetricDifference(s1.set, s2.set)]);
      rows.push([`(${s1.name} ∪ ${s2.name})ᶜ`, `De Morgan: complemento de la unión.`, complement(union(s1.set, s2.set), U)]);
      rows.push([`${s1.name}ᶜ ∩ ${s2.name}ᶜ`, `De Morgan: intersección de complementos.`, intersection(complement(s1.set, U), complement(s2.set, U))]);
      rows.push([`(${s1.name} ∩ ${s2.name})ᶜ`, `De Morgan: complemento de la intersección.`, complement(intersection(s1.set, s2.set), U)]);
      rows.push([`${s1.name}ᶜ ∪ ${s2.name}ᶜ`, `De Morgan: unión de complementos.`, union(complement(s1.set, U), complement(s2.set, U))]);
    }
  }

  if (activeSets.length >= 3) {
    const allUnion = unionMany(activeSets.map((s) => s.set));
    const allInter = intersectionMany(activeSets.map((s) => s.set));
    rows.push([namesJoin(activeSets, ' ∪ '), 'Unión de todos los conjuntos activos.', allUnion]);
    rows.push([namesJoin(activeSets, ' ∩ '), 'Intersección de todos los conjuntos activos.', allInter]);
    rows.push([`(${namesJoin(activeSets, ' ∪ ')})ᶜ`, 'De Morgan general: complemento de la unión total.', complement(allUnion, U)]);
    rows.push([activeSets.map((s) => `${s.name}ᶜ`).join(' ∩ '), 'De Morgan general: intersección de complementos.', intersectionMany(activeSets.map((s) => complement(s.set, U)))]);
    rows.push([`(${namesJoin(activeSets, ' ∩ ')})ᶜ`, 'De Morgan general: complemento de la intersección total.', complement(allInter, U)]);
    rows.push([activeSets.map((s) => `${s.name}ᶜ`).join(' ∪ '), 'De Morgan general: unión de complementos.', unionMany(activeSets.map((s) => complement(s.set, U)))]);
  }

  $('operationsTable').innerHTML = table(['Operación', 'Lectura', 'Resultado', 'Cardinal'], rows.map(([op, desc, res]) => [op, desc, renderValue(res), res.items.length]));
}

function renderMembershipMatrix() {
  const { activeSets, U } = lastState;
  if (!activeSets.length) {
    $('membershipMatrix').innerHTML = emptyPanel('No hay conjuntos activos.');
    return;
  }
  const domain = union(U, ...activeSets.map((s) => s.set));
  const headers = ['Elemento de U / dominio', ...activeSets.map((s) => `∈ ${s.name}`), 'Región'];
  const rows = domain.items.map((item) => {
    const flags = activeSets.map((s) => has(s.set, item));
    const sig = flags.map(Boolean).map((v) => v ? '1' : '0').join('');
    return [renderValue(item), ...flags.map(boolText), regionName(sig, activeSets)];
  });
  $('membershipMatrix').innerHTML = table(headers, rows, true);
}

function renderRelations() {
  const { activeSets, U } = lastState;
  if (!activeSets.length) {
    $('relationsTable').innerHTML = emptyPanel('No hay relaciones para mostrar.');
    return;
  }
  const pairs = [...activeSets.map((s) => [s.name, s.set]), ['U', U]];
  const rows = [];
  for (let i = 0; i < pairs.length; i++) {
    for (let j = 0; j < pairs.length; j++) {
      if (i === j) continue;
      const [n1, s1] = pairs[i];
      const [n2, s2] = pairs[j];
      rows.push([
        `${n1} ⊆ ${n2}`,
        boolText(subset(s1, s2)),
        properSubset(s1, s2) ? 'Subconjunto propio' : sameSet(s1, s2) ? 'Iguales' : subset(s1, s2) ? 'Incluido' : `Contraejemplo: ${renderValue(firstCounterexample(s1, s2))}`
      ]);
    }
  }

  for (let i = 0; i < activeSets.length; i++) {
    for (let j = i + 1; j < activeSets.length; j++) {
      const s1 = activeSets[i], s2 = activeSets[j];
      rows.push([`${s1.name} = ${s2.name}`, boolText(sameSet(s1.set, s2.set)), sameSet(s1.set, s2.set) ? 'Mismos elementos; el orden y las repeticiones no importan.' : 'No tienen exactamente los mismos elementos.']);
      rows.push([`${s1.name} ∩ ${s2.name} = ∅`, boolText(disjoint(s1.set, s2.set)), disjoint(s1.set, s2.set) ? 'Son disjuntos.' : `Comparten ${renderValue(intersection(s1.set, s2.set))}.`]);
    }
  }
  $('relationsTable').innerHTML = table(['Relación', 'Valor', 'Explicación'], rows, true);
}

function firstCounterexample(a, b) { return a.items.find((x) => !has(b, x)) || makeSet([]); }

function renderPowerSets() {
  const { activeSets } = lastState;
  const host = $('powerSets');
  if (!activeSets.length) {
    host.innerHTML = emptyPanel('No hay conjuntos activos.');
    return;
  }
  host.innerHTML = activeSets.map(({ name, set }) => {
    const p = powerSet(set, 256);
    const visible = p.subsets.map(renderValue).join(', ');
    return `<article class="power-card">
      <h3>P(${escapeHtml(name)})</h3>
      <div class="big-number">${p.total}</div>
      <p>subconjuntos posibles${p.capped ? ` · mostrando ${p.subsets.length}` : ''}</p>
      <div class="set-list">{${escapeHtml(visible)}}${p.capped ? '<br>… vista recortada por tamaño.' : ''}</div>
    </article>`;
  }).join('');
}

function renderPractice() {
  const { activeSets, U, X } = lastState;
  if (!activeSets.length) {
    $('practiceList').innerHTML = emptyPanel('No hay proposiciones para generar.');
    return;
  }
  const candidates = [];
  if (X) {
    for (const { name, set } of activeSets) {
      candidates.push({ formula: `${renderValue(X)} ∈ ${name}`, value: has(set, X) });
      if (isSet(X)) candidates.push({ formula: `${renderValue(X)} ⊆ ${name}`, value: subset(X, set) });
      else candidates.push({ formula: `{${renderValue(X)}} ⊆ ${name}`, value: subset(makeSet([X]), set) });
    }
  }

  for (const { name, set } of activeSets) {
    candidates.push({ formula: `∅ ⊆ ${name}`, value: subset(makeSet([]), set) });
    candidates.push({ formula: `∅ ∈ ${name}`, value: has(set, makeSet([])) });
    candidates.push({ formula: `${name} ⊆ U`, value: subset(set, U) });
    candidates.push({ formula: `${name} ∩ ${name}ᶜ = ∅`, value: sameSet(intersection(set, complement(set, U)), makeSet([])) });
    candidates.push({ formula: `${name} ∪ ${name}ᶜ = U`, value: sameSet(union(set, complement(set, U)), U) });

    for (const item of set.items.slice(0, 4)) {
      candidates.push({ formula: `${renderValue(item)} ∈ ${name}`, value: has(set, item) });
      if (isSet(item)) candidates.push({ formula: `${renderValue(item)} ⊆ ${name}`, value: subset(item, set) });
      candidates.push({ formula: `{${renderValue(item)}} ⊆ ${name}`, value: subset(makeSet([item]), set) });
    }
  }

  const unique = [];
  const seen = new Set();
  for (const row of candidates) {
    if (!seen.has(row.formula)) { seen.add(row.formula); unique.push(row); }
  }
  $('practiceList').innerHTML = unique.slice(0, 24).map((row) => `
    <article class="practice-card ${row.value ? 'true' : 'false'}">
      <div class="formula">${escapeHtml(row.formula)}</div>
      <strong class="${row.value ? 'true-text' : 'false-text'}">${row.value ? 'VERDADERO' : 'FALSO'}</strong>
    </article>
  `).join('');
}

function regionName(sig, activeSets) {
  if (!activeSets.length) return 'Sin conjuntos';
  const inside = [];
  const outside = [];
  sig.split('').forEach((bit, idx) => {
    if (bit === '1') inside.push(activeSets[idx].name);
    else outside.push(activeSets[idx].name);
  });
  if (!inside.length) return `Fuera de ${namesJoin(activeSets, ' ∪ ')}`;
  if (inside.length === 1 && outside.length) return `Solo ${inside[0]}`;
  if (!outside.length) return inside.join(' ∩ ');
  return `${inside.join(' ∩ ')}, sin ${outside.join(' ni ')}`;
}

function namesJoin(activeSets, sep) {
  return activeSets.map((s) => s.name).join(sep);
}

function boolText(value) {
  return value ? '<span class="true-text">Verdadero</span>' : '<span class="false-text">Falso</span>';
}

function table(headers, rows, trustedHtml = false) {
  const allowedHtml = (cell) => trustedHtml && /^<span class="(?:true-text|false-text|neutral-text)">[\s\S]*<\/span>$/.test(String(cell));
  const safeCell = (cell) => allowedHtml(cell) ? String(cell) : escapeHtml(String(cell));
  if (!rows.length) return emptyPanel('Sin datos para mostrar.');
  return `<table>
    <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(row => `<tr>${row.map((cell, idx) => `<td class="${idx === 0 || idx === 2 ? 'mono' : ''}">${safeCell(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

function emptyPanel(text) {
  return `<div class="help-box"><p>${escapeHtml(text)}</p></div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function escapeSvg(value) { return escapeHtml(value); }

function loadExample() {
  const e = EXAMPLES[exampleIndex % EXAMPLES.length];
  exampleIndex++;
  $('setA').value = e.A;
  $('setB').value = e.B;
  $('setC').value = e.C;
  $('setU').value = e.U;
  $('numericWindow').value = '-10..10';
  $('queryX').value = e.X;
  $('exprInput').value = e.E;
  $('vennExpressionInput').value = '';
  vennCustomExpression = '';
  analyze();
}

function clearAll() {
  $('setA').value = '';
  $('setB').value = '';
  $('setC').value = '';
  $('setU').value = '';
  $('numericWindow').value = '-10..10';
  $('queryX').value = '';
  $('exprInput').value = '';
  $('vennExpressionInput').value = '';
  vennCustomExpression = '';
  analyze();
}

function openVennModal() {
  const modal = $('vennModal');
  modal.hidden = false;
  syncVennModal();
  $('btnCloseVennModal').focus();
}

function closeVennModal() {
  $('vennModal').hidden = true;
}

function syncVennModal() {
  const modal = $('vennModal');
  const modalSvg = $('vennModalSvg');
  const source = $('vennSvg');
  if (!modal || !modalSvg || !source || modal.hidden) return;
  modalSvg.innerHTML = source.innerHTML;
  applyVennZoom();
}

function applyVennZoom() {
  const svg = $('vennModalSvg')?.querySelector('svg');
  if (!svg) return;
  svg.style.transform = `scale(${vennZoom})`;
  svg.style.marginRight = `${Math.max(0, vennZoom - 1) * 100}%`;
  svg.style.marginBottom = `${Math.max(0, vennZoom - 1) * 80}%`;
}

function setVennZoom(level) {
  vennZoom = Math.min(3, Math.max(0.6, level));
  applyVennZoom();
}

function wire() {
  $('btnAnalyze').addEventListener('click', analyze);
  $('btnClear').addEventListener('click', clearAll);
  $('btnExample').addEventListener('click', loadExample);
  $('highlightSelect').addEventListener('change', () => {
    vennCustomExpression = '';
    $('vennExpressionInput').value = '';
    renderVenn();
  });
  $('btnShowVennExpression').addEventListener('click', () => {
    vennCustomExpression = $('vennExpressionInput').value.trim();
    renderVenn();
  });
  $('btnExpandVenn').addEventListener('click', openVennModal);
  $('btnCloseVennModal').addEventListener('click', closeVennModal);
  $('btnVennZoomIn').addEventListener('click', () => setVennZoom(vennZoom + 0.15));
  $('btnVennZoomOut').addEventListener('click', () => setVennZoom(vennZoom - 0.15));
  $('btnVennZoomReset').addEventListener('click', () => setVennZoom(1));
  $('vennModal').addEventListener('click', (event) => {
    if (event.target === $('vennModal')) closeVennModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('vennModal').hidden) closeVennModal();
  });
  ['setA','setB','setC','setU','numericWindow','queryX','exprInput'].forEach(id => {
    $(id).addEventListener('input', debounce(analyze, 220));
  });
  analyze();
}

function debounce(fn, wait) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

document.addEventListener('DOMContentLoaded', wire);

import objectInspect from 'object-inspect';

// Based on https://github.com/browserify/node-util/blob/4b1c0c79790d9968eabecd2e9c786454713e200f/util.js#L33
export function format(value?: unknown, ...substitutions: unknown[]) {
  if (typeof value !== 'string') {
    return [value, ...substitutions].map(inspect).join(' ');
  }

  let result = String(value).replace(/%[sdj%]/g, (x) => {
    if (x === '%%') return '%';
    if (substitutions.length === 0) return x;

    switch (x) {
      case '%s':
        return String(substitutions.unshift());

      case '%d':
        return String(Number(substitutions.unshift()));

      case '%j':
        try {
          return JSON.stringify(substitutions.unshift());
        } catch {
          return '[Circular]';
        }

      default:
        return x;
    }
  });

  for (const x of substitutions) {
    if (typeof x !== 'object' || x === null) {
      result += ` ${x}`;
    } else {
      result += ` ${inspect(x)}`;
    }
  }

  return result;
}

const inspect = (value: unknown) => objectInspect(transformValueForFormat(value));

function transformValueForFormat(originalValue: unknown): any {
  const visitedValues = new Map();

  return transform(originalValue);

  function transform(value: unknown) {
    if (visitedValues.has(value)) return visitedValues.get(value);

    const result = rawTransform(value);
    visitedValues.set(value, result);
    return result;
  }

  function rawTransform(value: unknown): unknown {
    if (typeof value !== 'object' || value == null) return value;
    if (value instanceof Date || value instanceof RegExp) return value;
    if (Array.isArray(value)) return value.map(transform);
    if (value instanceof Set) return new Set([...value].map(transform));
    if (value instanceof Map) {
      return new Map([...value].map(([k, v]) => [transform(k), transform(v)]));
    }

    if (isPanelBase(value)) {
      return { ...value, style: { inspect: () => '[VCSSStyleDeclaration]' } };
    }

    const newObject: Record<string, any> = {};

    for (const [k, v] of Object.entries(value)) {
      newObject[k] = transform(v);
    }

    Object.setPrototypeOf(newObject, Object.getPrototypeOf(value));

    return newObject;
  }
}

const isPanelBase = (value: object): value is PanelBase =>
  'paneltype' in value &&
  'rememberchildfocus' in value &&
  'SetPanelEvent' in value &&
  'RunScriptInPanelContext' in value;

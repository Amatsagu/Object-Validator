import { Schema, ArrayVariable, Variable, ObjectVariable } from "./variables.ts";

export function validate(schema: Schema, input: Record<string, unknown>, customName?: string) {
    if (typeof schema !== "object") throw new TypeError("Schema needs to be an object.");
    if (typeof input !== "object") throw new TypeError("Input needs to be an object.");

    const path = { name: customName ?? "Obj", key: "" };

    for (const key in schema) {
        path.key = key;
        const checker = schema[key];
        const item = input[key];

        if (item !== undefined) scan(checker, item, path);
        else if (checker.required === true) throw new TypeError(`${path.name}.${path.key} is required.`);
    }
}

function scan(checker: Variable, item: unknown, path: { name: string; key: string }) {
    switch (checker.type) {
        case "string": {
            if (typeof item !== "string") throw new TypeError(`${path.name}.${path.key} needs to be type of string.`);
            if (checker.min !== undefined && checker.min > item.length) throw new TypeError(`${path.name}.${path.key} needs to be at least ${checker.min} characters.`);
            if (checker.max !== undefined && checker.max < item.length) throw new TypeError(`${path.name}.${path.key} exceeds max length limit by ${item.length - checker.max} characters.`);
            if (checker.match instanceof RegExp && checker.match.test(item) === false) throw new TypeError(`${path.name}.${path.key} doesn't met regex (${String(checker.match)}) requirements.`);
            if (checker.filter !== undefined && checker.filter(item) !== true) throw new TypeError(`${path.name}.${path.key} failed to pass through schema filter.`);
            break;
        }
        case "int":
        case "float": {
            if (typeof item !== "number") throw new TypeError(`${path.name}.${path.key} needs to be type of ${checker.type}.`);
            if (checker.type === "int" && !Number.isInteger(item)) throw new TypeError(`${path.name}.${path.key} needs to be type of int.`);
            if (checker.min !== undefined && checker.min > item) throw new TypeError(`${path.name}.${path.key} cannot be smaller than ${checker.min}.`);
            if (checker.max !== undefined && checker.max < item) throw new TypeError(`${path.name}.${path.key} cannot be greater than ${checker.max}.`);
            if (checker.finite === true && Number.isFinite(item) === false) throw new TypeError(`${path.name}.${path.key} needs to be finite.`);
            if (checker.filter !== undefined && checker.filter(item) !== true) throw new TypeError(`${path.name}.${path.key} failed to pass through schema filter.`);
            break;
        }
        case "boolean":
        case "function": {
            // deno-lint-ignore valid-typeof
            if (typeof item !== checker.type) throw new TypeError(`${path.name}.${path.key} needs to be type of ${checker.type}.`);
            break;
        }
        case "unknown":
            if (checker.filter !== undefined && checker.filter(item) !== true) throw new TypeError(`${path.name}.${path.key} failed to pass through schema filter.`);
            break;
        case "array": {
            scanArray(checker, item as unknown[], path);
            break;
        }
        case "object": {
            scanObject(checker, item as Record<string, unknown>, path);
            break;
        }
        default: throw new TypeError(`Failed to resolve type of ${path.name}.${path.key}. Please fix your schema.`);
    }
}

function scanArray(checker: ArrayVariable, items: unknown[], path: { name: string; key: string }) {
    if (Array.isArray(items) === false) throw new TypeError(`${path.name}.${path.key} needs to be type of array.`);
    if (checker.min !== undefined && checker.min > items.length) throw new TypeError(`${path.name}.${path.key} needs to contain at least ${checker.min} element(s).`);
    if (checker.max !== undefined && checker.max < items.length) throw new TypeError(`${path.name}.${path.key} can't contain more than ${checker.max} element(s).`);

    const base = path.key;

    for (let i = 0; i < items.length; i++) {
        path.key = `${base}[${i}]`;
        scan(checker.elementType, items[i], path);
    }
}

function scanObject(checker: ObjectVariable, items: Record<string, unknown>, path: { name: string; key: string }) {
    if (typeof items !== "object") throw new TypeError(`${path.name}.${path.key} needs to be an object.`);

    const base = path.key;

    for (const key in checker.records) {
        path.key = `${base}[${key}]`;
        const tester = checker.records[key];
        const item = items[key];

        if (item !== undefined) scan(tester, item, path);
        else if (tester.required === true) throw new TypeError(`${path.name}.${path.key} is required.`);
    }
}
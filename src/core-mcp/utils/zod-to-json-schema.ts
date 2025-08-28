import type { z } from 'zod';

// This file converts Zod schemas to JSON Schema for MCP SDK
// The any types are necessary for accessing Zod's internal _def structure
/* eslint-disable @typescript-eslint/no-explicit-any */

export function zodToJsonSchema(schema: z.ZodTypeAny): unknown {
  // Minimal conversion: rely on Zod's shape introspection where possible
  const def = (schema as any)._def;
  const typeName = def?.typeName || '';

  // Extract description if available
  const description = def?.description;

  let result: any;

  switch (typeName) {
    case 'ZodObject': {
      const shape = def.shape();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const key of Object.keys(shape)) {
        const child: z.ZodTypeAny = shape[key];
        const isOptional =
          (child as any)._def?.typeName === 'ZodOptional' ||
          (child as any)._def?.typeName === 'ZodDefault';
        // Pass the full schema to preserve descriptions
        properties[key] = zodToJsonSchema(child);
        if (!isOptional) required.push(key);
      }
      result = { type: 'object', properties, required };
      break;
    }
    case 'ZodString':
      result = { type: 'string' };
      break;
    case 'ZodNumber':
      result = { type: 'number' };
      break;
    case 'ZodBoolean':
      result = { type: 'boolean' };
      break;
    case 'ZodArray':
      result = { type: 'array', items: zodToJsonSchema(def.type) };
      break;
    case 'ZodEnum':
      result = { type: 'string', enum: def.values };
      break;
    case 'ZodUnion':
      result = { anyOf: def.options.map((o: z.ZodTypeAny) => zodToJsonSchema(o)) };
      break;
    case 'ZodOptional':
      // Handle optional types by processing the inner type
      result = zodToJsonSchema(def.innerType);
      // Check if the optional wrapper itself has a description
      if (!result.description && description) {
        result.description = description;
      }
      break;
    case 'ZodDefault':
      // Handle default types by processing the inner type and adding default value
      result = zodToJsonSchema(def.innerType);
      if (def.defaultValue !== undefined) {
        result.default = def.defaultValue();
      }
      // Check if the default wrapper itself has a description
      if (!result.description && description) {
        result.description = description;
      }
      break;
    default:
      result = {};
  }

  // Add description if it exists
  if (description && result) {
    result.description = description;
  }

  return result;
}

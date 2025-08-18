import type { z } from 'zod';

export function zodToJsonSchema(schema: z.ZodTypeAny): unknown {
  // Minimal conversion: rely on Zod's shape introspection where possible
  const def = (schema as any)._def;
  const typeName = def?.typeName || '';
  switch (typeName) {
    case 'ZodObject': {
      const shape = def.shape();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const key of Object.keys(shape)) {
        const child: z.ZodTypeAny = shape[key];
        const isOptional = (child as any)._def?.typeName === 'ZodOptional' || (child as any)._def?.typeName === 'ZodDefault';
        properties[key] = zodToJsonSchema(isOptional ? (child as any)._def.innerType : child);
        if (!isOptional) required.push(key);
      }
      return { type: 'object', properties, required };
    }
    case 'ZodString':
      return { type: 'string' };
    case 'ZodNumber':
      return { type: 'number' };
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodArray':
      return { type: 'array', items: zodToJsonSchema(def.type) };
    case 'ZodEnum':
      return { type: 'string', enum: def.values };
    case 'ZodUnion':
      return { anyOf: def.options.map((o: z.ZodTypeAny) => zodToJsonSchema(o)) };
    default:
      return {};
  }
}



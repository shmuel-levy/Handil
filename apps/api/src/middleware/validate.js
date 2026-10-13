/**
 * Turns a zod schema into Express middleware.
 *
 * On success `req.body` is replaced with the parsed, coerced and trimmed value,
 * so routes can trust their input and unknown keys are dropped (which also
 * closes off mass-assignment).
 *
 * On failure it returns 400 with the first issue's message. The API has always
 * returned a single Hebrew string, and the mobile client renders `message`
 * directly, so that shape is preserved. The full issue list is included as
 * `errors` for clients that want per-field feedback.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});

    if (!result.success) {
      const issues = result.error.issues ?? [];
      const first  = issues[0];
      return res.status(400).json({
        message: first?.message ?? 'קלט לא תקין',
        errors: issues.map((i) => ({
          field: i.path.join('.') || undefined,
          message: i.message,
        })),
      });
    }

    req[source] = result.data;
    next();
  };
}

module.exports = { validate };

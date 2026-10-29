// Validates and normalises ingestion payloads. Throws ValidationError (-> HTTP 400).
const AVAILABILITY = ['Immediate', '2 weeks', 'Not looking'];

class ValidationError extends Error {}

function cleanList(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError(`${field} must be a non-empty array of strings`);
  }
  const items = value.map((v) => {
    if (typeof v !== 'string' || v.trim() === '') {
      throw new ValidationError(`${field} must contain only non-empty strings`);
    }
    return v.trim().toLowerCase();
  });
  return [...new Set(items)];
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

function requireNonNegInt(value, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative integer`);
  }
  return value;
}

function validateCandidate(body) {
  if (typeof body !== 'object' || body === null) throw new ValidationError('body must be an object');
  if (!AVAILABILITY.includes(body.availability)) {
    throw new ValidationError(`availability must be one of: ${AVAILABILITY.join(', ')}`);
  }
  return {
    name: requireText(body.name, 'name'),
    skills: cleanList(body.skills, 'skills'),
    experience_years: requireNonNegInt(body.experience_years, 'experience_years'),
    availability: body.availability,
    traits: body.traits === undefined ? [] : cleanList(body.traits, 'traits'),
    quirk: typeof body.quirk === 'string' ? body.quirk : null,
  };
}

function validateJob(body) {
  if (typeof body !== 'object' || body === null) throw new ValidationError('body must be an object');
  return {
    title: requireText(body.title, 'title'),
    required_skills: cleanList(body.required_skills, 'required_skills'),
    min_experience: requireNonNegInt(body.min_experience, 'min_experience'),
    culture_keywords: body.culture_keywords === undefined ? [] : cleanList(body.culture_keywords, 'culture_keywords'),
    tagline: typeof body.tagline === 'string' ? body.tagline : null,
  };
}

module.exports = { ValidationError, validateCandidate, validateJob, AVAILABILITY };

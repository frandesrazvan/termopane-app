export class AuthRequiredError extends Error {
  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class TenantRequiredError extends Error {
  constructor(message = "An active tenant membership is required.") {
    super(message);
    this.name = "TenantRequiredError";
  }
}

export class PermissionDeniedError extends Error {
  constructor(message = "Permission denied.") {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

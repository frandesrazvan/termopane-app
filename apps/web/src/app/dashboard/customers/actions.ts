"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/auth";
import {
  createTenantCustomer,
  createTenantProject,
  getTenantProject,
  updateTenantCustomer,
  updateTenantProject,
  type TenantCustomerWriteInput,
  type TenantProjectWriteInput,
} from "@/lib/data";

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value.length > 0 ? value : null));

const optionalEmail = z
  .string()
  .trim()
  .max(320)
  .refine((value) => value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
  .transform((value) => (value.length > 0 ? value : null));

const customerSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  companyName: optionalText(160),
  contactName: optionalText(160),
  email: optionalEmail,
  phone: optionalText(80),
  taxIdentifier: optionalText(80),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(120),
  country: optionalText(120),
  notes: optionalText(1000),
});

const projectSchema = z.object({
  customerId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(160),
  siteAddress: optionalText(240),
  notes: optionalText(1000),
});

function formText(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value : "";
}

function parseCustomerForm(formData: FormData, fallbackPath: string): TenantCustomerWriteInput {
  const parsed = customerSchema.safeParse({
    displayName: formText(formData, "displayName"),
    companyName: formText(formData, "companyName"),
    contactName: formText(formData, "contactName"),
    email: formText(formData, "email"),
    phone: formText(formData, "phone"),
    taxIdentifier: formText(formData, "taxIdentifier"),
    addressLine1: formText(formData, "addressLine1"),
    addressLine2: formText(formData, "addressLine2"),
    city: formText(formData, "city"),
    country: formText(formData, "country"),
    notes: formText(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(`${fallbackPath}?error=validation`);
  }

  return parsed.data;
}

function parseProjectForm(
  formData: FormData,
  customerId: string,
  fallbackPath: string,
): TenantProjectWriteInput {
  const parsed = projectSchema.safeParse({
    customerId,
    name: formText(formData, "name"),
    siteAddress: formText(formData, "siteAddress"),
    notes: formText(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(`${fallbackPath}?error=validation`);
  }

  return parsed.data;
}

export async function createCustomerAction(formData: FormData) {
  const context = await requireTenant();
  const customer = await createTenantCustomer(
    context,
    parseCustomerForm(formData, "/dashboard/customers/new"),
  );

  redirect(`/dashboard/customers/${customer.id}`);
}

export async function updateCustomerAction(customerId: string, formData: FormData) {
  const context = await requireTenant();
  const customer = await updateTenantCustomer(
    context,
    customerId,
    parseCustomerForm(formData, `/dashboard/customers/${customerId}/edit`),
  );

  if (!customer) {
    redirect("/forbidden");
  }

  redirect(`/dashboard/customers/${customer.id}`);
}

export async function createProjectAction(customerId: string, formData: FormData) {
  const context = await requireTenant();
  const project = await createTenantProject(
    context,
    parseProjectForm(formData, customerId, `/dashboard/customers/${customerId}/projects/new`),
  );

  if (!project) {
    redirect("/forbidden");
  }

  redirect(`/dashboard/customers/${project.customerId}/projects/${project.id}`);
}

export async function updateProjectAction(
  customerId: string,
  projectId: string,
  formData: FormData,
) {
  const context = await requireTenant();
  const existingProject = await getTenantProject(context, projectId);

  if (!existingProject || existingProject.customerId !== customerId) {
    redirect("/forbidden");
  }

  const project = await updateTenantProject(
    context,
    projectId,
    parseProjectForm(
      formData,
      customerId,
      `/dashboard/customers/${customerId}/projects/${projectId}/edit`,
    ),
  );

  if (!project) {
    redirect("/forbidden");
  }

  redirect(`/dashboard/customers/${project.customerId}/projects/${project.id}`);
}

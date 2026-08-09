import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@peopletrackers/db';
import { prisma } from '@peopletrackers/db';
import { clientCreateSchema, clientUpdateSchema, clientListQuerySchema } from '@peopletrackers/shared';
import { buildBeginsWithSearch } from '../lib/search.js';

// Spec §12.1 — Client list Find fields.
const CLIENT_SEARCH_FIELDS = ['company', 'contactName', 'kind', 'email', 'phone', 'city', 'state'];

async function resolvePackageId(packageCode: string | null | undefined): Promise<string | null | undefined> {
  if (packageCode === undefined) return undefined; // not provided — leave untouched
  if (packageCode === null) return null;
  const pkg = await prisma.package.findUnique({ where: { code: packageCode } });
  return pkg?.id ?? null;
}

const clientsRoutes: FastifyPluginAsync = async (fastify) => {
  // §9.5 Clients list — Company, Name, Kind, Address, Phone, Email; sortable by Company;
  // needs-review filter (D11, informational only).
  fastify.get('/clients', async (request) => {
    const query = clientListQuerySchema.parse(request.query);

    const where: Prisma.ClientWhereInput = {
      ...(query.needsReview !== undefined ? { needsReview: query.needsReview } : {}),
      ...(query.search ? buildBeginsWithSearch(query.search, CLIENT_SEARCH_FIELDS) : {}),
    };

    const orderBy: Prisma.ClientOrderByWithRelationInput =
      query.sort === '-company' ? { company: 'desc' } : { company: 'asc' };

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { package: true },
      }),
      prisma.client.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  });

  fastify.get<{ Params: { id: string } }>('/clients/:id', async (request, reply) => {
    const client = await prisma.client.findUnique({
      where: { id: request.params.id },
      include: { package: true },
    });
    if (!client) return reply.notFound('Client not found.');
    return client;
  });

  fastify.post('/clients', async (request, reply) => {
    const body = clientCreateSchema.parse(request.body);
    const packageId = await resolvePackageId(body.packageCode);

    // §6.8 client defaults on create: postal address copies the physical address unless given;
    // non_locate_fee copies locate_fee unless given. Independently editable afterwards.
    const client = await prisma.client.create({
      data: {
        company: body.company,
        contactName: body.contactName,
        kind: body.kind,
        phone: body.phone,
        fax: body.fax,
        email: body.email,
        emailInvoice: body.emailInvoice,
        emailReports: body.emailReports,
        addr1: body.addr1,
        addr2: body.addr2,
        city: body.city,
        state: body.state,
        postcode: body.postcode,
        country: body.country ?? 'Australia',
        postalAddr1: body.postalAddr1 ?? body.addr1,
        postalAddr2: body.postalAddr2 ?? body.addr2,
        postalCity: body.postalCity ?? body.city,
        postalState: body.postalState ?? body.state,
        postalPostcode: body.postalPostcode ?? body.postcode,
        postalCountry: body.postalCountry ?? body.country ?? 'Australia',
        attention: body.attention,
        terms: body.terms,
        abn: body.abn,
        notes: body.notes,
        packageId: packageId ?? undefined,
        fileFee: body.fileFee,
        locateFee: body.locateFee,
        nonLocateFee: body.nonLocateFee ?? body.locateFee,
        hourlyFee: body.hourlyFee,
        createdBy: request.authUser?.id,
        updatedBy: request.authUser?.id,
      },
    });

    return reply.status(201).send(client);
  });

  fastify.put<{ Params: { id: string } }>('/clients/:id', async (request, reply) => {
    const body = clientUpdateSchema.parse(request.body);
    const { packageCode, ...fields } = body;
    const packageId = await resolvePackageId(packageCode);

    const existing = await prisma.client.findUnique({ where: { id: request.params.id } });
    if (!existing) return reply.notFound('Client not found.');

    const data: Prisma.ClientUncheckedUpdateInput = {
      ...fields,
      packageId,
      updatedBy: request.authUser?.id,
    };

    const client = await prisma.client.update({
      where: { id: request.params.id },
      data,
    });

    return client;
  });

  fastify.delete<{ Params: { id: string } }>('/clients/:id', async (request, reply) => {
    try {
      await prisma.client.delete({ where: { id: request.params.id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return reply.notFound('Client not found.');
      }
      // Case.clientId is ON DELETE RESTRICT — spec: "refused with a clear message" once cases exist (Phase 3).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        return reply.conflict('This client has cases and cannot be deleted.');
      }
      throw err;
    }
    return reply.status(204).send();
  });
};

export default clientsRoutes;

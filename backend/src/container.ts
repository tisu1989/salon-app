/**
 * Composition root - the one place that wires repositories, services and
 * controllers together via manual constructor injection. Everything else
 * (routers, handlers) receives already-built instances from here.
 */
import { prisma } from "./config/prisma.js";
import { redis } from "./config/redis.js";

import { AppointmentRepository } from "./modules/appointment/appointment.repository.js";
import { AppointmentService } from "./modules/appointment/appointment.service.js";
import { AppointmentController } from "./modules/appointment/appointment.controller.js";

import { StaffRepository } from "./modules/staff/staff.repository.js";
import { StaffController } from "./modules/staff/staff.controller.js";

import { ServiceRepository } from "./modules/service/service.repository.js";
import { ServiceController } from "./modules/service/service.controller.js";

import { AuthService } from "./modules/auth/auth.service.js";
import { AuthController } from "./modules/auth/auth.controller.js";

import { CustomerRepository } from "./modules/customer/customer.repository.js";
import { CustomerController } from "./modules/customer/customer.controller.js";

import { WhatsappSessionStore } from "./modules/whatsapp/whatsapp.session.js";
import { WhatsappClient } from "./modules/whatsapp/whatsapp.client.js";
import { WhatsappService } from "./modules/whatsapp/whatsapp.service.js";
import { WhatsappController } from "./modules/whatsapp/whatsapp.controller.js";

import { NotificationRepository } from "./modules/notification/notification.repository.js";
import { NotificationService } from "./modules/notification/notification.service.js";
import { NotificationController } from "./modules/notification/notification.controller.js";

const staffRepo = new StaffRepository(prisma);
const serviceRepo = new ServiceRepository(prisma);
const appointmentRepo = new AppointmentRepository(prisma);
const customerRepo = new CustomerRepository(prisma);
const notificationRepo = new NotificationRepository(prisma, redis);

const authService = new AuthService(staffRepo, redis);
const appointmentService = new AppointmentService(
  appointmentRepo,
  staffRepo,
  serviceRepo,
  notificationRepo,
);

const whatsappSessions = new WhatsappSessionStore(redis);
const whatsappClient = new WhatsappClient();
const whatsappService = new WhatsappService(
  whatsappSessions,
  whatsappClient,
  customerRepo,
  serviceRepo,
  staffRepo,
  appointmentService,
);

const notificationService = new NotificationService(notificationRepo, whatsappClient);

export const controllers = {
  auth: new AuthController(authService),
  appointment: new AppointmentController(appointmentService),
  staff: new StaffController(staffRepo, authService),
  service: new ServiceController(serviceRepo),
  customer: new CustomerController(customerRepo),
  whatsapp: new WhatsappController(whatsappService),
  notification: new NotificationController(notificationService),
};

// Not part of the HTTP surface - server.ts hands this to startNotificationWorker.
export const services = {
  notification: notificationService,
};

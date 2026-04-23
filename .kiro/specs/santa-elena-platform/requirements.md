# Requirements Document

## Introduction

Santa Elena Platform es una plataforma web progresiva (PWA) tipo marketplace comunitario para la comunidad rural de Santa Elena (Medellín, Colombia). El sistema resuelve la dificultad de encontrar servicios locales confiables, facilita el intercambio de bienes y herramientas, y construye una red de confianza digital entre vecinos. Está diseñada para personas con baja alfabetización digital, uso desde celular y conexión limitada a internet.

## Glossary

- **Platform**: El sistema web progresivo Santa Elena Platform.
- **Visitor**: Usuario no autenticado que puede explorar el contenido público.
- **Member**: Usuario registrado y autenticado, miembro de la comunidad.
- **Verified_Provider**: Member con insignia de confianza otorgada por el Administrador.
- **Administrator**: Usuario con permisos de moderación, validación y gestión del sistema.
- **Listing**: Publicación de servicio, artículo en venta, alquiler, trueque o herramienta compartida.
- **Service_Directory**: Módulo de directorio de servicios locales con categorías y filtros.
- **Marketplace**: Módulo de compra, venta, alquiler y trueque de artículos.
- **Tool_Library**: Módulo de préstamo y reserva de herramientas compartidas.
- **Trust_System**: Sistema de calificaciones, comentarios e insignias de confianza.
- **Vereda**: Subdivisión geográfica rural dentro de Santa Elena usada para filtrar por ubicación.
- **Rating**: Calificación numérica de 1 a 5 estrellas otorgada por un Member a un proveedor o Listing.
- **Badge**: Insignia visual asignada a un Verified_Provider para indicar confianza comunitaria.
- **Notification**: Aviso enviado a un Member sobre eventos relevantes dentro de la Platform.
- **Report**: Denuncia enviada por un Member sobre contenido o usuario inapropiado.

---

## Requirements

### Requirement 1: Registro y autenticación de usuarios

**User Story:** As a community member, I want to create an account and log in, so that I can publish listings and contact other members.

#### Acceptance Criteria

1. THE Platform SHALL require a valid phone number and email address during Member registration.
2. WHEN a Member submits a registration form with valid data, THE Platform SHALL create the account and send a verification code to the provided phone number.
3. WHEN a Member enters a correct verification code, THE Platform SHALL activate the account and grant access.
4. IF a Member submits a registration form with an already-registered email or phone number, THEN THE Platform SHALL display an error message indicating the conflict without revealing which field is duplicated.
5. WHEN a Member provides valid credentials on the login form, THE Platform SHALL authenticate the Member and start a session.
6. IF a Member provides invalid credentials on the login form, THEN THE Platform SHALL display a generic error message and increment a failed-attempt counter for that account.
7. WHEN a Member's failed-attempt counter reaches 5 within 10 minutes, THE Platform SHALL temporarily lock the account for 15 minutes and notify the Member via email.
8. WHERE Google OAuth is enabled, THE Platform SHALL allow Members to register and log in using a Google account, requiring phone number verification on first login.
9. WHEN a Member requests a password reset, THE Platform SHALL send a reset link to the registered email address that expires after 30 minutes.

---

### Requirement 2: Directorio de servicios locales

**User Story:** As a community member, I want to browse and filter local services, so that I can find reliable providers near me.

#### Acceptance Criteria

1. THE Service_Directory SHALL display Listings organized under the categories: Hogar, Construcción, Transporte, Tecnología, and Agricultura.
2. WHEN a Visitor or Member selects a category, THE Service_Directory SHALL display only Listings belonging to that category.
3. WHEN a Visitor or Member applies a Vereda filter, THE Service_Directory SHALL display only Listings whose location matches the selected Vereda.
4. WHEN a Visitor or Member applies a minimum Rating filter, THE Service_Directory SHALL display only Listings with an average Rating equal to or greater than the specified value.
5. WHEN a Visitor or Member applies an availability filter, THE Service_Directory SHALL display only Listings marked as currently available.
6. THE Service_Directory SHALL display Listings from Verified_Providers before Listings from unverified Members when no explicit sort order is applied.
7. WHEN a Visitor or Member opens a service Listing, THE Platform SHALL display the provider's name, category, Vereda, average Rating, number of completed jobs, description, and contact options.

---

### Requirement 3: Marketplace comunitario

**User Story:** As a community member, I want to publish and browse items for sale, rent, or trade, so that I can exchange goods with my neighbors.

#### Acceptance Criteria

1. WHEN a Member creates a Listing, THE Marketplace SHALL require a title, description, listing type (Venta, Alquiler, or Trueque), and Vereda.
2. WHEN a Member creates a Listing of type Venta or Alquiler, THE Marketplace SHALL allow the Member to optionally specify a price in Colombian pesos (COP).
3. WHEN a Member creates a Listing of type Trueque, THE Marketplace SHALL allow the Member to describe the desired exchange item or service.
4. WHEN a Member uploads images for a Listing, THE Platform SHALL accept up to 5 images per Listing, each with a maximum size of 5 MB, in JPEG or PNG format.
5. WHEN a Member submits a new Listing, THE Platform SHALL make the Listing visible to Visitors and Members within 5 minutes, provided it has not been flagged for moderation.
6. WHEN a Member marks a Listing as completed or sold, THE Platform SHALL update the Listing status to inactive and remove it from active search results.
7. IF a Member attempts to create a Listing while having 3 or more active unmoderated Reports against their account, THEN THE Platform SHALL prevent the creation and display a message indicating the account is under review.

---

### Requirement 4: Sistema de confianza y reputación

**User Story:** As a community member, I want to rate and review providers, so that the community can identify trustworthy members.

#### Acceptance Criteria

1. WHEN a Member completes a transaction or service with another Member, THE Trust_System SHALL allow the initiating Member to submit a Rating between 1 and 5 stars and an optional text comment.
2. THE Trust_System SHALL calculate a provider's average Rating as the arithmetic mean of all submitted Ratings, rounded to one decimal place.
3. WHEN a new Rating is submitted for a provider, THE Trust_System SHALL update the provider's displayed average Rating within 60 seconds.
4. THE Trust_System SHALL display the total number of completed jobs on each provider's profile.
5. WHEN the Administrator grants the Verified_Provider status to a Member, THE Platform SHALL display a Badge on that Member's profile and all their Listings.
6. IF a Member attempts to submit more than one Rating for the same provider within a 30-day period, THEN THE Trust_System SHALL reject the duplicate submission and inform the Member.
7. WHEN a Member submits a text comment, THE Trust_System SHALL limit the comment to 500 characters.

---

### Requirement 5: Comunicación entre usuarios

**User Story:** As a community member, I want to contact a provider directly, so that I can arrange a service or transaction with minimal friction.

#### Acceptance Criteria

1. WHEN a Member views a service or Marketplace Listing, THE Platform SHALL display a button that opens a pre-filled WhatsApp conversation with the provider's registered phone number.
2. THE Platform SHALL provide an internal messaging system that allows Members to exchange text messages without sharing personal contact details.
3. WHEN a Member sends an internal message, THE Platform SHALL deliver the message to the recipient's inbox within 10 seconds under normal network conditions.
4. WHEN a Member receives a new internal message, THE Platform SHALL send a Notification to the recipient.
5. IF a Visitor attempts to use the WhatsApp button or internal messaging, THEN THE Platform SHALL prompt the Visitor to register or log in before proceeding.
6. WHILE a Member's account is locked or under review, THE Platform SHALL prevent the Member from sending new internal messages.

---

### Requirement 6: Geolocalización por veredas

**User Story:** As a community member, I want to see services near my zone, so that I can find providers without traveling far.

#### Acceptance Criteria

1. THE Platform SHALL represent location using Vereda names rather than exact street addresses to protect user privacy.
2. WHEN a Member creates a Listing, THE Platform SHALL require the Member to select a Vereda from a predefined list.
3. WHEN a Visitor or Member views the map view, THE Platform SHALL display a basic map showing approximate Listing locations grouped by Vereda, without revealing exact coordinates.
4. WHEN a Member enables location access in the browser, THE Platform SHALL automatically suggest the closest Vereda based on the device's GPS coordinates.
5. IF a Member's browser denies location access, THEN THE Platform SHALL allow the Member to manually select a Vereda without requiring GPS.

---

### Requirement 7: Notificaciones

**User Story:** As a community member, I want to receive relevant notifications, so that I can stay informed about activity that matters to me.

#### Acceptance Criteria

1. WHEN a new Listing is published in a Vereda that a Member has marked as followed, THE Platform SHALL send a Notification to that Member within 5 minutes of publication.
2. WHEN a Member receives a reply to one of their Listings, THE Platform SHALL send a Notification to the Listing owner.
3. WHEN a Member receives a new service request or message, THE Platform SHALL send a Notification to the recipient.
4. THE Platform SHALL deliver Notifications via in-app alerts and, WHERE push notifications are enabled by the Member's device, via browser push notifications.
5. WHEN a Member opens the Notifications panel, THE Platform SHALL display all unread Notifications sorted by date descending.
6. WHEN a Member marks a Notification as read, THE Platform SHALL update its status to read within 5 seconds.
7. THE Platform SHALL retain Notification history for each Member for a minimum of 90 days.

---

### Requirement 8: Módulo de herramientas compartidas (Tool Library)

**User Story:** As a community member, I want to borrow or lend tools, so that I can access equipment I don't own without buying it.

#### Acceptance Criteria

1. WHEN a Member publishes a tool in the Tool_Library, THE Platform SHALL require a name, description, condition (Bueno, Regular, or Necesita reparación), and Vereda.
2. WHEN a Member views a tool Listing, THE Tool_Library SHALL display a calendar showing the tool's availability, with reserved dates clearly marked.
3. WHEN a Member submits a reservation request for a tool, THE Tool_Library SHALL notify the tool owner and block the requested dates as pending on the calendar.
4. WHEN the tool owner approves a reservation request, THE Tool_Library SHALL confirm the reservation, mark the dates as reserved on the calendar, and notify the requesting Member.
5. IF the tool owner does not respond to a reservation request within 48 hours, THEN THE Tool_Library SHALL automatically cancel the request and notify the requesting Member.
6. WHEN a reservation is completed, THE Tool_Library SHALL prompt both the tool owner and the borrower to submit a Rating for the transaction.
7. WHEN a Member cancels a confirmed reservation with less than 24 hours notice, THE Platform SHALL record the cancellation on the Member's profile history.

---

### Requirement 9: Moderación de contenido y seguridad

**User Story:** As an administrator, I want to moderate content and validate users, so that the platform remains trustworthy and safe for the community.

#### Acceptance Criteria

1. WHEN a Member submits a Report against a Listing or another Member, THE Platform SHALL record the Report and notify the Administrator within 10 minutes.
2. WHEN the Administrator reviews a Report, THE Platform SHALL allow the Administrator to remove the reported Listing, suspend the reported Member's account, or dismiss the Report.
3. WHEN the Administrator suspends a Member's account, THE Platform SHALL immediately prevent that Member from logging in and hide all their active Listings.
4. THE Platform SHALL automatically flag Listings that contain URLs or phone numbers in the title or description for Administrator review before publication.
5. WHEN a Member's account accumulates 5 or more Reports within a 30-day period, THE Platform SHALL automatically suspend the account and notify the Administrator.
6. THE Administrator SHALL be able to create, rename, and deactivate service categories without requiring a code deployment.
7. WHEN the Administrator validates a Member as a Verified_Provider, THE Platform SHALL record the validation date, the Administrator's user ID, and the reason for verification.

---

### Requirement 10: Experiencia de usuario para baja alfabetización digital

**User Story:** As a community member with limited digital experience, I want a simple and clear interface, so that I can use the platform from my phone without assistance.

#### Acceptance Criteria

1. THE Platform SHALL complete any primary user flow (registration, publishing a Listing, contacting a provider) in a maximum of 3 sequential steps.
2. THE Platform SHALL display interactive elements (buttons, form fields, navigation items) with a minimum touch target size of 44x44 CSS pixels.
3. THE Platform SHALL use plain language in all interface labels, error messages, and instructions, avoiding technical jargon.
4. THE Platform SHALL display confirmation feedback (visual or textual) within 2 seconds after any user action that modifies data.
5. WHEN the Platform detects a network connection loss, THE Platform SHALL display a clear offline indicator and allow the Member to continue browsing previously loaded content.
6. WHEN the Platform restores network connectivity, THE Platform SHALL automatically synchronize any pending actions queued during the offline period.
7. THE Platform SHALL achieve a Lighthouse Performance score of 70 or above on a simulated mid-range Android device with a 3G network profile.
8. THE Platform SHALL achieve a Lighthouse Accessibility score of 85 or above.

---

### Requirement 11: Administración de categorías y contenido

**User Story:** As an administrator, I want to manage categories and platform content, so that the directory stays organized and relevant to the community.

#### Acceptance Criteria

1. THE Administrator SHALL be able to add a new service category with a name, icon, and description through the administration panel.
2. WHEN the Administrator deactivates a category, THE Platform SHALL hide the category from new Listing creation forms while preserving existing Listings under that category.
3. THE Administrator SHALL be able to feature up to 5 Listings on the Platform's home page at any given time.
4. WHEN the Administrator removes a featured Listing from the home page, THE Platform SHALL replace it with the next highest-rated active Listing in the same category within 5 minutes.

---

### Requirement 12: Escalabilidad y expansión futura

**User Story:** As a platform operator, I want the system to support expansion to other rural zones, so that the model can be replicated without rebuilding the platform.

#### Acceptance Criteria

1. THE Platform SHALL support multiple community zones (comunidades), each with its own set of Veredas, categories, and Members, within a single deployment.
2. WHEN a new community zone is created by the Administrator, THE Platform SHALL isolate that zone's Listings and Members from other zones by default.
3. THE Platform SHALL expose a versioned REST API for all core operations, enabling future integration with native mobile applications or third-party services.
4. THE Platform SHALL store all user-generated content in a structure that allows export in JSON format for data portability.

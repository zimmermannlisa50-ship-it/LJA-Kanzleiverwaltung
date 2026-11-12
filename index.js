require("dotenv").config();
const runtime = require("./runtime-guard");
try { runtime.assertAuthorizedRuntime(); } catch (error) { console.error(error.message); process.exit(1); }

const {
    Client,
    GatewayIntentBits,
    ChannelType,
    SlashCommandBuilder,
    REST,
    Routes,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    AttachmentBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const ticketWorkflow = require("./ticket-workflow");
const ticketRouting = require("./ticket-routing")();
const diagnostics = require("./bot-diagnostics");

// ==========================================
// LIBERTY JUSTICE ASSOCIATES
// Kanzleiverwaltung
// ==========================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = "1569762821124915274";
const GUILD_ID = "1477731363082993665";

// ==========================================
// ROLLENBERECHTIGUNGEN
// ==========================================

const ADMIN_ROLE_IDS = [
    "1498410446879850606",
    "1477932272370978836",
    "1483906597297062142",
    "1477931389335765103",
    "1477931752537194557",
    "1477932417166868571",
    "1485672247610970132"
];

const HANDLER_ROLE_IDS = [
    "1492156535042871446",
    "1485672966770528468",
    "1485672247610970132"
];

const LEADERSHIP_ROLE_ID = "1485672247610970132";

// ==========================================
// TICKET-KATEGORIEN
// ==========================================

const TICKET_CATEGORIES = {
    strafverteidigung: {
        label: "Notfall / Strafverteidigung",
        emoji: "⚖️",
        categoryId: "1478007088465838274"
    },
    klage: {
        label: "Klage gegen Staat / Amtshaftung",
        emoji: "🏛️",
        categoryId: "1478007088465838274"
    },
    beratung: { label: "Allgemeine Rechtsberatung", emoji: "💬", categoryId: "1478007088465838274" },
    vertraege: {
        label: "Verträge / Unternehmen",
        emoji: "📜",
        categoryId: "1478007300458287345"
    },
    beschwerde: { label: "Beschwerde", emoji: "🚩", categoryId: "1484218404092121340" },
    bewerbung: {
        label: "Bewerbungen",
        emoji: "💼",
        categoryId: "1570448935992954921"
    }
};

// ==========================================
// DATENSPEICHER
// ==========================================

const DATA_DIR = path.join(__dirname, "data");
const TICKET_DATA_FILE = path.join(DATA_DIR, "ticket-data.json");
const COUNTER_FILE = path.join(DATA_DIR, "ticket-counters.json");
const LOG_DIR = path.join(DATA_DIR, "ticket-logs");

function ensureStorage() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(LOG_DIR, { recursive: true });

    if (!fs.existsSync(TICKET_DATA_FILE)) {
        fs.writeFileSync(TICKET_DATA_FILE, "{}");
    }

    if (!fs.existsSync(COUNTER_FILE)) {
        fs.writeFileSync(COUNTER_FILE, JSON.stringify({
            strafverteidigung: 0,
            klage: 0,
            vertraege: 0,
            bewerbung: 0
        }, null, 2));
    }
}

function readJson(file) {
    ensureStorage();

    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
        return {};
    }
}

function writeJson(file, data) {
    ensureStorage();
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getTicketData() {
    return readJson(TICKET_DATA_FILE);
}

function saveTicketData(data) {
    writeJson(TICKET_DATA_FILE, data);
}

function cleanName(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
}

function truncate(value, maxLength = 1024) {
    const text = String(value ?? "");
    return text.length > maxLength
        ? text.slice(0, maxLength - 3) + "..."
        : text;
}

function hasRole(member, roleIds) {
    return roleIds.some(roleId => member.roles.cache.has(roleId));
}

function isHandler(member) {
    return hasRole(member, HANDLER_ROLE_IDS) || require("./personnel/rules").lawyer(member);
}

function isLeadership(member) {
    return member.roles.cache.has(LEADERSHIP_ROLE_ID) || require("./personnel/rules").has(member, require("./personnel/config").LEADS);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatTicketNumber(number) {
    return String(number).padStart(4, "0");
}
// ==========================================
// TICKET-STATUS
// ==========================================

const getTicketStatus = ticketWorkflow.status;

// ==========================================
// TICKET-EMBED ERSTELLEN
// ==========================================

const { buildTicketEmbed, buildTicketComponents } = require("./ticket-ui");

async function updateTicketMessage(channel, ticket) {
    ticketWorkflow.syncName(channel, ticket);
    if (!ticket.messageId) return;

    try {
        const message = await channel.messages.fetch(ticket.messageId);

        await message.edit({
            embeds: [buildTicketEmbed(ticket)],
            components: buildTicketComponents(ticket)
        });
        if (["strafverteidigung", "klage", "beratung"].includes(ticket.categoryKey)) await personnel.caseIndex(ticket);
    } catch (error) {
        diagnostics.error("Ticket-Nachricht", error);
    }
}

// ==========================================
// TICKET-EVENTS SPEICHERN
// ==========================================

function addTicketEvent(ticket, event, userId, details = "") {
    if (!ticket.events) {
        ticket.events = [];
    }

    ticket.events.push({
        event,
        userId,
        details,
        timestamp: new Date().toISOString()
    });
}
// ==========================================
// HTML-TRANSKRIPT ERSTELLEN
// ==========================================

async function createHtmlTranscript(channel, ticket) {
    return require("./ticket-transcript")(channel, ticket, { directory: LOG_DIR });
}
// ==========================================
// DISCORD-BOT INITIALISIEREN
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ==========================================
// SLASH-COMMANDS
// ==========================================

const panels = require("./panels")({ client, hasRole, ADMIN_ROLE_IDS, TICKET_CATEGORIES, readJson, writeJson, DATA_DIR });
const registrationStore = require("./registration-store");
const personnel = require("./personnel")(client, { getTickets: getTicketData, saveTickets: saveTicketData, update: updateTicketMessage });
client.on("guildMemberAdd", async member => {
    if (member.guild.id !== GUILD_ID || member.user.bot) return;
    try {
        if (registrationStore.mustRegister(member.id) && member.roles.cache.has("1477932235842654299")) await member.roles.remove("1477932235842654299", "IC-Registrierung steht noch aus");
        await require("./registration").invite(member);
    } catch (error) { console.error("Registrierungsbeitritt:", error.message); }
});
client.on("guildMemberUpdate", async (before, member) => {
    if (member.guild.id !== GUILD_ID || member.user.bot) return;
    try {
        if (registrationStore.mustRegister(member.id) && member.roles.cache.has("1477932235842654299")) await member.roles.remove("1477932235842654299", "IC-Registrierung steht noch aus");
        if (!registrationStore.read().invited?.[member.id]) await require("./registration").invite(member);
    } catch (error) { console.error("Registrierungsfreigabe:", error.message); }
});
client.on("interactionCreate", async interaction => {
    if (!interaction.customId?.startsWith("lja_reg:v2:")) return;
    const modulePath = require.resolve("./registration"); delete require.cache[modulePath];
    await require(modulePath).handle(client, interaction);
});
const commands = [
    new SlashCommandBuilder().setName("personal-panel").setDescription("Aktualisiert die interne Personalverwaltung.").toJSON(),
    new SlashCommandBuilder().setName("bot-panel").setDescription("?ffnet die Kanzlei-Botverwaltung.").toJSON(),
    new SlashCommandBuilder()
        .setName("ticket-panel")
        .setDescription("Erstellt das Ticket-Panel der Kanzlei.")
        .toJSON()
];

// ==========================================
// SLASH-COMMANDS REGISTRIEREN
// ==========================================

async function registerCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        console.log("Registriere Slash-Commands...");

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log("Slash-Commands erfolgreich registriert.");
    } catch (error) {
        diagnostics.error("Command-Registrierung", error);
    }
}

// ==========================================
// BOT STARTEN
// ==========================================

client.once("clientReady", async () => {
    console.log(`LJA-Kanzleiverwaltung online als ${client.user.tag}`);

    ensureStorage();
    await registerCommands();
    await panels.start().catch(console.error);
    await personnel.start().catch(error => console.error("Personalverwaltung:", error.message));
    if (registrationStore.read().active) {
        const guild = await client.guilds.fetch(GUILD_ID);
        if (guild.members.cache.size < guild.memberCount) await guild.members.fetch();
        for (const member of guild.members.cache.values()) await require("./registration").invite(member);
    }
});

// ==========================================
// INTERACTION-HANDLER
// ==========================================

client.on("interactionCreate", async interaction => {

    try {

        // ==================================
        // /ticket-panel
        // ==================================

        if (interaction.isChatInputCommand()) {

            if (interaction.commandName === "ticket-panel") {

                if (!hasRole(interaction.member, ADMIN_ROLE_IDS)) {
                    return interaction.reply({
                        content: "Du bist nicht berechtigt, dieses Panel zu erstellen.",
                        flags: 64
                    });
                }

                await interaction.deferReply({ flags: 64 });
                await panels.publish("tickets");
                await interaction.editReply("Ticket-Panel ver?ffentlicht.");
            }
        }

        // Weitere Interaktionen folgen in Teil 5.

    } catch (error) {
        diagnostics.error("Interaktion", error, interaction);

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.",
                flags: 64
            }).catch(() => {});
        }
    }
});
// ==========================================
// TICKET-AUSWAHL UND TICKET-ERSTELLUNG
// ==========================================

client.on("interactionCreate", async interaction => {

    try {
        const route = ticketRouting.parse(interaction.customId);
        if (!route) return;

        // ==================================
        // TICKET-KATEGORIE AUSWÄHLEN
        // ==================================

        if (
            interaction.isStringSelectMenu() &&
            route.action === "type"
        ) {

            if (registrationStore.mustRegister(interaction.user.id)) return await interaction.reply({content: "Bitte zuerst deine IC-Daten nach Annahme des Kanzleiregelwerks hinterlegen: <#1477943304694923397>", flags: 64});
            const categoryKey = interaction.values[0];
            if (categoryKey === "rollen") return await panels.chooseRole(interaction);
            const category = TICKET_CATEGORIES[categoryKey];

            if (!category) {
                return interaction.reply({
                    content: "Diese Ticketkategorie ist ungültig.",
                    flags: 64
                });
            }

            const modal = new ModalBuilder()
                .setCustomId(ticketRouting.formId(categoryKey))
                .setTitle("Anfrage an Liberty Justice Associates");

            const firstName = new TextInputBuilder()
                .setCustomId("firstName")
                .setLabel("IC-Vorname")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50);

            const lastName = new TextInputBuilder()
                .setCustomId("lastName")
                .setLabel("IC-Nachname")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50);

            const subject = new TextInputBuilder()
                .setCustomId("subject")
                .setLabel("Betreff des Anliegens")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const facts = new TextInputBuilder()
                .setCustomId("facts")
                .setLabel("Sachverhalt")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("Bitte schildere dein Anliegen möglichst ausführlich.")
                .setRequired(true)
                .setMaxLength(4000);

            const phone = new TextInputBuilder().setCustomId("phone").setLabel("IC-Telefonnummer").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50);
            const savedProfile = registrationStore.profile(interaction.user.id);
            if (savedProfile) { if (savedProfile.firstName) firstName.setValue(savedProfile.firstName); if (savedProfile.lastName) lastName.setValue(savedProfile.lastName); if (savedProfile.phone) phone.setValue(savedProfile.phone); }
            const inputs = categoryKey === "bewerbung" ? [firstName, lastName, phone] : [firstName, lastName, phone, subject, facts];
            modal.addComponents(...inputs.map(input => new ActionRowBuilder().addComponents(input)));
            await interaction.showModal(modal);
            diagnostics.acknowledged(interaction);
            return;
        }

        // ==================================
        // FORMULAR ABSENDEN
        // ==================================

        if (
            interaction.isModalSubmit() &&
            route.action === "form"
        ) {

            await interaction.deferReply({ flags: 64 });
            diagnostics.acknowledged(interaction);

            const categoryKey = route.category;

            const category = TICKET_CATEGORIES[categoryKey];

            if (!category) {
                return interaction.editReply({
                    content: "Die ausgewählte Ticketkategorie wurde nicht gefunden."
                });
            }

            if (registrationStore.mustRegister(interaction.user.id)) return await interaction.editReply("Bitte zuerst deine IC-Daten über den Button im Kanzleiregelwerk hinterlegen.");
            if (categoryKey === "bewerbung" && personnel.isBlacklisted(interaction.member)) return await interaction.editReply("Du kannst derzeit keine Bewerbung einreichen.");
            const firstName = interaction.fields.getTextInputValue("firstName").trim();
            const lastName = interaction.fields.getTextInputValue("lastName").trim();
            const phone = interaction.fields.getTextInputValue("phone").trim();
            require("./ticket-profile").validate({ firstName, lastName, phone });
            const subject = categoryKey === "bewerbung" ? "Bewerbung" : interaction.fields.getTextInputValue("subject").trim();
            const facts = categoryKey === "bewerbung" ? "Bewerbung eingegangen." : interaction.fields.getTextInputValue("facts").trim();

            // Nummer für die jeweilige Kategorie erhöhen
            const counters = readJson(COUNTER_FILE);

            const ticketNumber = ticketWorkflow.number(counters, categoryKey, Object.values(getTicketData()));
            writeJson(COUNTER_FILE, counters);
            const channelName = ticketWorkflow.name({ categoryKey, ticketNumber, firstName, lastName }) ||
                `${ticketNumber}-${cleanName(categoryKey)}-${cleanName(firstName)}-${cleanName(lastName)}`.slice(0, 100);

            // Ticketkanal erstellen
            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category.categoryId,
                permissionOverwrites: categoryKey === "bewerbung" ? personnel.applicationOverwrites(interaction.guild, interaction.user.id) : [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: ["ViewChannel"]
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            "ViewChannel",
                            "SendMessages",
                            "ReadMessageHistory",
                            "AttachFiles",
                            "EmbedLinks"
                        ]
                    },
                    {
                        id: client.user.id,
                        allow: [
                            "ViewChannel",
                            "SendMessages",
                            "ReadMessageHistory",
                            "ManageChannels",
                            "AttachFiles",
                            "EmbedLinks"
                        ]
                    },
                    ...HANDLER_ROLE_IDS.map(roleId => ({
                        id: roleId,
                        allow: [
                            "ViewChannel",
                            "SendMessages",
                            "ReadMessageHistory",
                            "AttachFiles"
                        ]
                    }))
                ]
            });

            // Ticketdaten speichern
            const ticket = {
                channelId: ticketChannel.id,
                userId: interaction.user.id,
                ticketNumber,
                categoryKey,
                categoryLabel: category.label,
                firstName,
                lastName,
                phone,
                subject,
                facts,
                dojCaseNumber: null,
                handlerId: null,
                completed: false,
                closed: false,
                paymentType: null,
                createdAt: new Date().toISOString(),
                messageId: null,
                events: []
            };

            addTicketEvent(
                ticket,
                "Ticket erstellt",
                interaction.user.id,
                category.label
            );

            // Ticketnachricht erstellen
            const ticketMessage = await ticketChannel.send({
                content: `<@${interaction.user.id}>`,
                embeds: [buildTicketEmbed(ticket)],
                components: buildTicketComponents(ticket)
            });

            ticket.messageId = ticketMessage.id;

            // Daten dauerhaft speichern
            const allTickets = getTicketData();
            allTickets[ticketChannel.id] = ticket;
            saveTicketData(allTickets);
            require("./ticket-profile").save(registrationStore, interaction.user.id, { firstName, lastName, phone });
            const nickname = await require("./nicknames").sync(interaction.member, { firstName, lastName });
            await personnel.profileChanged(interaction.member);

            await interaction.editReply({
                content:
                    `Dein Ticket wurde erfolgreich erstellt: ${ticketChannel}\n\n` +
                    (categoryKey === "bewerbung" ? "" : `Ticketnummer: **${ticketNumber}**`) + (nickname.notice ? `\n${nickname.notice}` : "")
            });

            console.log(`Ticket ${ticketNumber} erstellt: ${ticketChannel.name}`);

            return;
        }

    } catch (error) {
        diagnostics.error("Ticket-Erstellung", error, interaction);
        if ([10062, 40060].includes(Number(error.code))) return;

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "Das Ticket konnte leider nicht erstellt werden.",
                flags: 64
            }).catch(() => {});
        } else if (interaction.deferred && !interaction.replied) {
            await interaction.editReply({
                content: "Das Ticket konnte leider nicht erstellt werden."
            }).catch(() => {});
        }
    }

});
// ==========================================
// TICKET-BEARBEITUNG
// ==========================================

client.on("interactionCreate", async interaction => {

    try {

        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        const customId = interaction.customId;
        if (!["lja_takeover", "lja_release", "lja_wait", "lja_case_number", "lja_done", "lja_pro_bono", "lja_paid", "lja_case_number_modal"].includes(customId)) return;


        const ticketData = getTicketData();
        const ticket = ticketData[interaction.channelId];

        if (!ticket) return;
        if (ticket.categoryKey === "bewerbung" && ["lja_takeover", "lja_release", "lja_wait"].includes(customId)) return await personnel.handleApplicationAssignment(interaction, ticket);
        if (ticket.categoryKey === "bewerbung" && !personnel.allowed(interaction.member)) return await interaction.reply({content: "Diese Aktion ist nur für die Personalverwaltung erlaubt.", flags: 64});
        if (ticket.closed) return await interaction.reply({content: "Dieses Ticket ist bereits geschlossen.", flags: 64});
        if (require("./ticket-close-state").locks.has(interaction.channelId)) return await interaction.reply({content: "Dieses Ticket wird gerade geschlossen.", flags: 64});

        // ==================================
        // TICKET ÜBERNEHMEN
        // ==================================

        if (["strafverteidigung", "klage", "beratung"].includes(ticket.categoryKey) && ["lja_takeover", "lja_release", "lja_wait"].includes(customId)) return await personnel.handleAssignment(interaction, ticket);

        if (customId === "lja_takeover") {

            if (!isHandler(interaction.member)) {
                return interaction.reply({
                    content: "Du bist nicht berechtigt, Tickets zu übernehmen.",
                    flags: 64
                });
            }

            if (ticket.handlerId) {
                return interaction.reply({
                    content: "Dieses Ticket wurde bereits übernommen.",
                    flags: 64
                });
            }

            if (ticket.completed || ticket.closed) {
                return interaction.reply({
                    content: "Dieses Ticket ist bereits abgeschlossen.",
                    flags: 64
                });
            }

            await interaction.deferReply({ flags: 64 });
            ticket.handlerId = interaction.user.id;
            ticket.waiting = false;

            addTicketEvent(
                ticket,
                "Ticket übernommen",
                interaction.user.id
            );

            saveTicketData(ticketData);

            await updateTicketMessage(interaction.channel, ticket);

            return interaction.editReply({
                content: `Du hast Ticket **${ticket.ticketNumber}** übernommen.`,
                flags: 64
            });
        }

        // ==================================
        // TICKET FREIGEBEN
        // ==================================

        if (customId === "lja_release") {

            if (!isHandler(interaction.member)) {
                return interaction.reply({
                    content: "Du bist nicht berechtigt, Tickets freizugeben.",
                    flags: 64
                });
            }

            if (!ticket.handlerId) {
                return interaction.reply({
                    content: "Dieses Ticket ist derzeit nicht übernommen.",
                    flags: 64
                });
            }

            if (
                ticket.handlerId !== interaction.user.id &&
                !isLeadership(interaction.member)
            ) {
                return interaction.reply({
                    content: "Nur der zuständige Bearbeiter oder die Kanzleileitung darf dieses Ticket freigeben.",
                    flags: 64
                });
            }

            await interaction.deferReply({ flags: 64 });
            ticket.handlerId = null;
            ticket.waiting = false;

            addTicketEvent(
                ticket,
                "Ticket freigegeben",
                interaction.user.id
            );

            saveTicketData(ticketData);

            await updateTicketMessage(interaction.channel, ticket);

            return interaction.editReply({
                content: "Das Ticket wurde wieder freigegeben.",
                flags: 64
            });
        }

        // ==================================
        // TICKET AUF WARTEN SETZEN
        // ==================================

        if (customId === "lja_wait") {

            if (!isHandler(interaction.member)) {
                return interaction.reply({
                    content: "Du bist nicht berechtigt, diesen Vorgang durchzuführen.",
                    flags: 64
                });
            }

            if (
                ticket.handlerId !== interaction.user.id &&
                !isLeadership(interaction.member)
            ) {
                return interaction.reply({
                    content: "Nur der zuständige Bearbeiter oder die Kanzleileitung darf diesen Vorgang durchführen.",
                    flags: 64
                });
            }

            await interaction.deferReply({ flags: 64 });
            ticket.handlerId = null;
            ticket.waiting = true;

            addTicketEvent(
                ticket,
                "Ticket auf Warten gesetzt",
                interaction.user.id
            );

            saveTicketData(ticketData);

            await updateTicketMessage(interaction.channel, ticket);

            return interaction.editReply({
                content: "Das Ticket wurde zurückgestellt und wartet auf eine weitere Bearbeitung.",
                flags: 64
            });
        }

        // ==================================
        // DOJ-AKTENZEICHEN HINTERLEGEN
        // ==================================

        if (customId === "lja_case_number") {

            if (!isLeadership(interaction.member)) {
                return interaction.reply({
                    content: "Nur die Kanzleileitung darf ein DOJ-Aktenzeichen hinterlegen.",
                    flags: 64
                });
            }

            const modal = new ModalBuilder()
                .setCustomId("lja_case_number_modal")
                .setTitle("DOJ-Aktenzeichen hinterlegen");

            const caseNumberInput = new TextInputBuilder()
                .setCustomId("caseNumber")
                .setLabel("DOJ-Aktenzeichen")
                .setPlaceholder("Aktenzeichen eingeben...")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            modal.addComponents(
                new ActionRowBuilder().addComponents(caseNumberInput)
            );

            return interaction.showModal(modal);
        }

        // ==================================
        // TICKET ALS ERLEDIGT MARKIEREN
        // ==================================

        if (customId === "lja_done") {

            if (!isHandler(interaction.member)) {
                return interaction.reply({
                    content: "Du bist nicht berechtigt, Tickets abzuschließen.",
                    flags: 64
                });
            }

            if (
                ticket.handlerId !== interaction.user.id &&
                !isLeadership(interaction.member)
            ) {
                return interaction.reply({
                    content: "Nur der zuständige Bearbeiter oder die Kanzleileitung darf dieses Ticket abschließen.",
                    flags: 64
                });
            }

            if (ticket.completed) {
                return interaction.reply({
                    content: "Dieses Ticket ist bereits als erledigt markiert.",
                    flags: 64
                });
            }

            await interaction.deferReply({ flags: 64 });
            ticket.completed = true;
            ticket.waiting = false;

            addTicketEvent(
                ticket,
                "Ticket als erledigt markiert",
                interaction.user.id
            );

            saveTicketData(ticketData);

            await updateTicketMessage(interaction.channel, ticket);

            await interaction.channel.send({
                content:
                    "Ihr Anliegen wurde geklärt. Vielen Dank für Ihr Vertrauen in Liberty Justice Associates."
            });

            return interaction.editReply({
                content: "Das Ticket wurde als erledigt markiert.",
                flags: 64
            });
        }

        // ==================================
        // PRO BONO / RECHNUNG BEZAHLT
        // ==================================

        if (
            customId === "lja_pro_bono" ||
            customId === "lja_paid"
        ) {

            if (!isHandler(interaction.member)) {
                return interaction.reply({
                    content: "Du bist nicht berechtigt, diese Auswahl vorzunehmen.",
                    flags: 64
                });
            }

            if (
                ticket.handlerId !== interaction.user.id &&
                !isLeadership(interaction.member)
            ) {
                return interaction.reply({
                    content: "Nur der zuständige Bearbeiter oder die Kanzleileitung darf diese Auswahl vornehmen.",
                    flags: 64
                });
            }

            if (!ticket.completed) {
                return interaction.reply({
                    content: "Das Ticket muss zuerst als erledigt markiert werden.",
                    flags: 64
                });
            }

            ticket.paymentType = customId === "lja_pro_bono"
                ? "Pro bono"
                : "Rechnung bezahlt";

            addTicketEvent(
                ticket,
                "Abschlussart ausgewählt",
                interaction.user.id,
                ticket.paymentType
            );

            saveTicketData(ticketData);

            await updateTicketMessage(interaction.channel, ticket);

            return interaction.reply({
                content: `Abschlussart gespeichert: **${ticket.paymentType}**`,
                flags: 64
            });
        }

        // ==================================
        // DOJ-AKTENZEICHEN FORMULAR
        // ==================================

        if (
            interaction.isModalSubmit() &&
            interaction.customId === "lja_case_number_modal"
        ) {

            if (!isLeadership(interaction.member)) {
                return interaction.reply({
                    content: "Nur die Kanzleileitung darf ein DOJ-Aktenzeichen hinterlegen.",
                    flags: 64
                });
            }

            const caseNumber = interaction.fields
                .getTextInputValue("caseNumber")
                .trim();

            ticket.dojCaseNumber = caseNumber;

            addTicketEvent(
                ticket,
                "DOJ-Aktenzeichen hinterlegt",
                interaction.user.id,
                caseNumber
            );

            saveTicketData(ticketData);

            await updateTicketMessage(interaction.channel, ticket);

            return interaction.reply({
                content: `DOJ-Aktenzeichen **${caseNumber}** wurde gespeichert.`,
                flags: 64
            });
        }

    } catch (error) {
        diagnostics.error("Ticket-Bearbeitung", error, interaction);

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "Bei der Bearbeitung ist ein Fehler aufgetreten.",
                flags: 64
            }).catch(() => {});
        }
    }
});
// ==========================================
// TICKET SCHLIESSEN UND ARCHIVIEREN
// ==========================================

client.on("interactionCreate", async interaction => {
    const modulePath = require.resolve("./ticket-close"); delete require.cache[modulePath];
    await require(modulePath)(interaction, {
        owner: registrationStore.read().instanceId || "local",
        getTickets: getTicketData, saveTickets: saveTicketData, isLeadership,
        update: updateTicketMessage, transcript: createHtmlTranscript, addEvent: addTicketEvent,
        workflow: ticketWorkflow, isPersonnel: personnel.allowed, onClosed: personnel.caseIndex
    });
});
// ==========================================
// BOT-LOGIN
// ==========================================

if (!TOKEN) {
    console.error("Fehler: DISCORD_TOKEN wurde nicht gefunden.");
    process.exit(1);
}

client.on("error", error => console.error("Discord-Clientfehler:", error.message));
runtime.acquire().then(() => client.login(TOKEN)).catch(error => { diagnostics.error("Botstart", error); process.exitCode = 1; });

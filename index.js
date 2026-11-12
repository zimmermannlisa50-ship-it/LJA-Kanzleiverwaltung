require("dotenv").config();

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
        categoryId: "1478006998137176065"
    },
    klage: {
        label: "Klage gegen Staat / Amtshaftung",
        emoji: "🏛️",
        categoryId: "1478007088465838274"
    },
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
    return hasRole(member, HANDLER_ROLE_IDS);
}

function isLeadership(member) {
    return member.roles.cache.has(LEADERSHIP_ROLE_ID);
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

function getTicketStatus(ticket) {
    if (ticket.closed) {
        return {
            emoji: "⚫",
            title: "Geschlossen",
            color: 0x555555
        };
    }

    if (ticket.completed) {
        return {
            emoji: "🟢",
            title: "Erledigt",
            color: 0x2ECC71
        };
    }

    if (ticket.handlerId) {
        return {
            emoji: "🟡",
            title: "In Bearbeitung",
            color: 0xF1C40F
        };
    }

    return {
        emoji: "🔴",
        title: "Wartet auf Bearbeitung",
        color: 0xE74C3C
    };
}

// ==========================================
// TICKET-EMBED ERSTELLEN
// ==========================================

function buildTicketEmbed(ticket) {
    const status = getTicketStatus(ticket);

    return new EmbedBuilder()
        .setColor(status.color)
        .setTitle(`${status.emoji} LIBERTY JUSTICE ASSOCIATES`)
        .setDescription(
            `**${ticket.categoryLabel}**\n\n` +
            `Vielen Dank für deine Kontaktaufnahme mit unserer Kanzlei.`
        )
        .addFields(
            {
                name: "Mandant",
                value: `<@${ticket.userId}>`,
                inline: true
            },
            {
                name: "Ticketnummer",
                value: ticket.ticketNumber,
                inline: true
            },
            {
                name: "Bearbeitungsstatus",
                value: ticket.handlerId
                    ? `Übernommen von <@${ticket.handlerId}>`
                    : status.title,
                inline: false
            },
            {
                name: "IC-Vorname",
                value: truncate(ticket.firstName),
                inline: true
            },
            {
                name: "IC-Nachname",
                value: truncate(ticket.lastName),
                inline: true
            },
            {
                name: "IC-Telefonnummer", value: ticket.phone || "Nicht hinterlegt", inline: false
            },
            {
                name: "Betreff des Anliegens",
                value: truncate(ticket.subject),
                inline: false
            },
            {
                name: "DOJ-Aktenzeichen",
                value: ticket.dojCaseNumber || "Noch nicht hinterlegt",
                inline: false
            },
            {
                name: "Sachverhalt",
                value: truncate(ticket.facts),
                inline: false
            },
            {
                name: "Abschluss",
                value: ticket.paymentType || "Noch nicht abgeschlossen",
                inline: false
            }
        )
        .setFooter({
            text: "Liberty Justice Associates | Kanzleiverwaltung"
        })
        .setTimestamp();
}

// ==========================================
// TICKET-BUTTONS
// ==========================================

function buildTicketComponents(ticket) {
    if (ticket.closed) {
        return [];
    }

    const rows = [];

    const firstRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("lja_takeover")
            .setLabel("Übernehmen")
            .setEmoji("📥")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(Boolean(ticket.handlerId) || ticket.completed),

        new ButtonBuilder()
            .setCustomId("lja_release")
            .setLabel("Freigeben")
            .setEmoji("🔓")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!ticket.handlerId || ticket.completed),

        new ButtonBuilder()
            .setCustomId("lja_wait")
            .setLabel("Warten")
            .setEmoji("⏳")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!ticket.handlerId || ticket.completed)
    );

    const secondRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("lja_case_number")
            .setLabel("DOJ-Aktenzeichen")
            .setEmoji("📁")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("lja_done")
            .setLabel("Erledigt")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success)
            .setDisabled(ticket.completed),

        new ButtonBuilder()
            .setCustomId("lja_close")
            .setLabel("Ticket schließen")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger)
    );

    rows.push(firstRow, secondRow);

    if (ticket.completed && !ticket.paymentType) {
        const thirdRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("lja_pro_bono")
                .setLabel("Pro bono")
                .setEmoji("⚖️")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("lja_paid")
                .setLabel("Rechnung bezahlt")
                .setEmoji("💶")
                .setStyle(ButtonStyle.Success)
        );

        rows.push(thirdRow);
    }

    return rows;
}

// ==========================================
// TICKET-NACHRICHT AKTUALISIEREN
// ==========================================

async function updateTicketMessage(channel, ticket) {
    if (!ticket.messageId) return;

    try {
        const message = await channel.messages.fetch(ticket.messageId);

        await message.edit({
            embeds: [buildTicketEmbed(ticket)],
            components: buildTicketComponents(ticket)
        });
    } catch (error) {
        console.error("Ticket-Nachricht konnte nicht aktualisiert werden:", error);
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
    const messages = [];
    let lastMessageId;

    // Nachrichten aus dem Ticket abrufen
    while (true) {
        const options = { limit: 100 };

        if (lastMessageId) {
            options.before = lastMessageId;
        }

        const batch = await channel.messages.fetch(options);

        if (batch.size === 0) break;

        messages.push(...batch.values());
        lastMessageId = batch.last().id;

        if (messages.length >= 1000) break;
    }

    // Chronologische Reihenfolge herstellen
    messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const messageHtml = messages.map(message => {
        const author = escapeHtml(
            message.member?.displayName ||
            message.author?.username ||
            "Unbekannt"
        );

        const content = escapeHtml(message.content || "")
            .replace(/\n/g, "<br>");

        const timestamp = new Date(message.createdTimestamp)
            .toLocaleString("de-DE");

        const attachments = [...message.attachments.values()]
            .map(file =>
                `<a href="${escapeHtml(file.url)}">${escapeHtml(file.name)}</a>`
            )
            .join("<br>");

        return `
            <div class="message">
                <div class="author">${author}</div>
                <div class="time">${timestamp}</div>
                <div class="content">${content}</div>
                ${attachments ? `<div class="attachments">${attachments}</div>` : ""}
            </div>
        `;
    }).join("");

    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>LJA Ticket ${escapeHtml(ticket.ticketNumber)}</title>
<style>
    body {
        font-family: Arial, sans-serif;
        background: #111318;
        color: #eeeeee;
        padding: 30px;
    }

    h1 {
        color: #d4af37;
        border-bottom: 1px solid #d4af37;
        padding-bottom: 15px;
    }

    .metadata {
        background: #20232b;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 25px;
        line-height: 1.8;
    }

    .message {
        background: #20232b;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 12px;
    }

    .author {
        color: #d4af37;
        font-weight: bold;
    }

    .time {
        color: #999999;
        font-size: 12px;
        margin: 4px 0 10px;
    }

    .content {
        white-space: normal;
        overflow-wrap: anywhere;
    }

    .attachments {
        margin-top: 10px;
    }

    a {
        color: #d4af37;
    }
</style>
</head>

<body>

<h1>LIBERTY JUSTICE ASSOCIATES</h1>
<h2>Ticket-Transkript</h2>

<div class="metadata">
    <strong>Ticketnummer:</strong> ${escapeHtml(ticket.ticketNumber)}<br>
    <strong>Kategorie:</strong> ${escapeHtml(ticket.categoryLabel)}<br>
    <strong>Mandant:</strong> ${escapeHtml(ticket.firstName)} ${escapeHtml(ticket.lastName)}<br>
    <strong>Discord-Nutzer:</strong> ${escapeHtml(ticket.userId)}<br>
    <strong>Betreff:</strong> ${escapeHtml(ticket.subject)}<br>
    <strong>DOJ-Aktenzeichen:</strong> ${escapeHtml(ticket.dojCaseNumber || "Nicht hinterlegt")}<br>
    <strong>Status:</strong> ${escapeHtml(getTicketStatus(ticket).title)}<br>
    <strong>Erstellt am:</strong> ${new Date(ticket.createdAt).toLocaleString("de-DE")}
</div>

<h2>Nachrichtenverlauf</h2>

${messageHtml}

</body>
</html>
    `;

    const fileName = `ticket-${ticket.ticketNumber}-transkript.html`;
    const filePath = path.join(LOG_DIR, fileName);

    fs.writeFileSync(filePath, html, "utf8");

    return new AttachmentBuilder(filePath, {
        name: fileName
    });
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
        console.error("Fehler bei der Command-Registrierung:", error);
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
    if (registrationStore.read().active) {
        const guild = await client.guilds.fetch(GUILD_ID);
        await guild.members.fetch();
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
                        ephemeral: true
                    });
                }

                await interaction.deferReply({ ephemeral: true });
                await panels.publish("tickets");
                await interaction.editReply("Ticket-Panel ver?ffentlicht.");
            }
        }

        // Weitere Interaktionen folgen in Teil 5.

    } catch (error) {
        console.error("Fehler bei einer Interaktion:", error);

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.",
                ephemeral: true
            }).catch(() => {});
        }
    }
});
// ==========================================
// TICKET-AUSWAHL UND TICKET-ERSTELLUNG
// ==========================================

client.on("interactionCreate", async interaction => {

    try {

        // ==================================
        // TICKET-KATEGORIE AUSWÄHLEN
        // ==================================

        if (
            interaction.isStringSelectMenu() &&
            interaction.customId === "lja_ticket_type"
        ) {

            if (registrationStore.mustRegister(interaction.user.id)) return await interaction.reply({content: "Bitte zuerst deine IC-Daten nach Annahme des Kanzleiregelwerks hinterlegen: <#1477943304694923397>", flags: 64});
            const categoryKey = interaction.values[0];
            if (categoryKey === "rollen") return await panels.chooseRole(interaction);
            const category = TICKET_CATEGORIES[categoryKey];

            if (!category) {
                return interaction.reply({
                    content: "Diese Ticketkategorie ist ungültig.",
                    ephemeral: true
                });
            }

            const modal = new ModalBuilder()
                .setCustomId(`lja_ticket_modal_${categoryKey}`)
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
            if (savedProfile) { firstName.setValue(savedProfile.firstName); lastName.setValue(savedProfile.lastName); phone.setValue(savedProfile.phone); }
            const inputs = categoryKey === "bewerbung" ? [firstName, lastName, phone] : [firstName, lastName, phone, subject, facts];
            modal.addComponents(...inputs.map(input => new ActionRowBuilder().addComponents(input)));
            await interaction.showModal(modal);
            return;
        }

        // ==================================
        // FORMULAR ABSENDEN
        // ==================================

        if (
            interaction.isModalSubmit() &&
            interaction.customId.startsWith("lja_ticket_modal_")
        ) {

            await interaction.deferReply({ ephemeral: true });

            const categoryKey = interaction.customId.replace(
                "lja_ticket_modal_",
                ""
            );

            const category = TICKET_CATEGORIES[categoryKey];

            if (!category) {
                return interaction.editReply({
                    content: "Die ausgewählte Ticketkategorie wurde nicht gefunden."
                });
            }

            if (registrationStore.mustRegister(interaction.user.id)) return await interaction.editReply("Bitte zuerst deine IC-Daten über den Button im Kanzleiregelwerk hinterlegen.");
            const firstName = interaction.fields.getTextInputValue("firstName").trim();
            const lastName = interaction.fields.getTextInputValue("lastName").trim();
            const phone = interaction.fields.getTextInputValue("phone").trim();
            const subject = categoryKey === "bewerbung" ? "Bewerbung" : interaction.fields.getTextInputValue("subject").trim();
            const facts = categoryKey === "bewerbung" ? "Bewerbung eingegangen." : interaction.fields.getTextInputValue("facts").trim();

            // Nummer für die jeweilige Kategorie erhöhen
            const counters = readJson(COUNTER_FILE);

            counters[categoryKey] = (counters[categoryKey] || 0) + 1;

            writeJson(COUNTER_FILE, counters);

            const ticketNumber = formatTicketNumber(counters[categoryKey]);

            // Kanalnamen erstellen
            const channelName =
                `${ticketNumber}-${cleanName(categoryKey)}-${cleanName(firstName)}-${cleanName(lastName)}`
                .slice(0, 100);

            // Ticketkanal erstellen
            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category.categoryId,
                permissionOverwrites: [
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

            await interaction.editReply({
                content:
                    `Dein Ticket wurde erfolgreich erstellt: ${ticketChannel}\n\n` +
                    `Ticketnummer: **${ticketNumber}**`
            });

            console.log(`Ticket ${ticketNumber} erstellt: ${ticketChannel.name}`);

            return;
        }

    } catch (error) {
        console.error("Fehler bei der Ticket-Erstellung:", error);

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "Das Ticket konnte leider nicht erstellt werden.",
                ephemeral: true
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

        const ticketData = getTicketData();
        const ticket = ticketData[interaction.channelId];

        if (!ticket) return;

        // ==================================
        // TICKET ÜBERNEHMEN
        // ==================================

        if (customId === "lja_takeover") {

            if (!isHandler(interaction.member)) {
                return interaction.reply({
                    content: "Du bist nicht berechtigt, Tickets zu übernehmen.",
                    ephemeral: true
                });
            }

            if (ticket.handlerId) {
                return interaction.reply({
                    content: "Dieses Ticket wurde bereits übernommen.",
                    ephemeral: true
                });
            }

            if (ticket.completed || ticket.closed) {
                return interaction.reply({
                    content: "Dieses Ticket ist bereits abgeschlossen.",
                    ephemeral: true
                });
            }

            ticket.handlerId = interaction.user.id;

            addTicketEvent(
                ticket,
                "Ticket übernommen",
                interaction.user.id
            );

            saveTicketData(ticketData);

            await updateTicketMessage(interaction.channel, ticket);

            return interaction.reply({
                content: `Du hast Ticket **${ticket.ticketNumber}** übernommen.`,
                ephemeral: true
            });
        }

        // ==================================
        // TICKET FREIGEBEN
        // ==================================

        if (customId === "lja_release") {

            if (!isHandler(interaction.member)) {
                return interaction.reply({
                    content: "Du bist nicht berechtigt, Tickets freizugeben.",
                    ephemeral: true
                });
            }

            if (!ticket.handlerId) {
                return interaction.reply({
                    content: "Dieses Ticket ist derzeit nicht übernommen.",
                    ephemeral: true
                });
            }

            if (
                ticket.handlerId !== interaction.user.id &&
                !isLeadership(interaction.member)
            ) {
                return interaction.reply({
                    content: "Nur der zuständige Bearbeiter oder die Kanzleileitung darf dieses Ticket freigeben.",
                    ephemeral: true
                });
            }

            ticket.handlerId = null;

            addTicketEvent(
                ticket,
                "Ticket freigegeben",
                interaction.user.id
            );

            saveTicketData(ticketData);

            await updateTicketMessage(interaction.channel, ticket);

            return interaction.reply({
                content: "Das Ticket wurde wieder freigegeben.",
                ephemeral: true
            });
        }

        // ==================================
        // TICKET AUF WARTEN SETZEN
        // ==================================

        if (customId === "lja_wait") {

            if (!isHandler(interaction.member)) {
                return interaction.reply({
                    content: "Du bist nicht berechtigt, diesen Vorgang durchzuführen.",
                    ephemeral: true
                });
            }

            if (
                ticket.handlerId !== interaction.user.id &&
                !isLeadership(interaction.member)
            ) {
                return interaction.reply({
                    content: "Nur der zuständige Bearbeiter oder die Kanzleileitung darf diesen Vorgang durchführen.",
                    ephemeral: true
                });
            }

            ticket.handlerId = null;

            addTicketEvent(
                ticket,
                "Ticket auf Warten gesetzt",
                interaction.user.id
            );

            saveTicketData(ticketData);

            await updateTicketMessage(interaction.channel, ticket);

            return interaction.reply({
                content: "Das Ticket wurde zurückgestellt und wartet auf eine weitere Bearbeitung.",
                ephemeral: true
            });
        }

        // ==================================
        // DOJ-AKTENZEICHEN HINTERLEGEN
        // ==================================

        if (customId === "lja_case_number") {

            if (!isLeadership(interaction.member)) {
                return interaction.reply({
                    content: "Nur die Kanzleileitung darf ein DOJ-Aktenzeichen hinterlegen.",
                    ephemeral: true
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
                    ephemeral: true
                });
            }

            if (
                ticket.handlerId !== interaction.user.id &&
                !isLeadership(interaction.member)
            ) {
                return interaction.reply({
                    content: "Nur der zuständige Bearbeiter oder die Kanzleileitung darf dieses Ticket abschließen.",
                    ephemeral: true
                });
            }

            if (ticket.completed) {
                return interaction.reply({
                    content: "Dieses Ticket ist bereits als erledigt markiert.",
                    ephemeral: true
                });
            }

            ticket.completed = true;

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

            return interaction.reply({
                content: "Das Ticket wurde als erledigt markiert.",
                ephemeral: true
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
                    ephemeral: true
                });
            }

            if (
                ticket.handlerId !== interaction.user.id &&
                !isLeadership(interaction.member)
            ) {
                return interaction.reply({
                    content: "Nur der zuständige Bearbeiter oder die Kanzleileitung darf diese Auswahl vornehmen.",
                    ephemeral: true
                });
            }

            if (!ticket.completed) {
                return interaction.reply({
                    content: "Das Ticket muss zuerst als erledigt markiert werden.",
                    ephemeral: true
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
                ephemeral: true
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
                    ephemeral: true
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
                ephemeral: true
            });
        }

    } catch (error) {
        console.error("Fehler bei der Ticket-Bearbeitung:", error);

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "Bei der Bearbeitung ist ein Fehler aufgetreten.",
                ephemeral: true
            }).catch(() => {});
        }
    }
});
// ==========================================
// TICKET SCHLIESSEN UND ARCHIVIEREN
// ==========================================

client.on("interactionCreate", async interaction => {

    try {

        if (!interaction.isButton()) return;

        const customId = interaction.customId;

        if (
            customId !== "lja_close" &&
            customId !== "lja_close_confirm" &&
            customId !== "lja_close_cancel"
        ) {
            return;
        }

        const ticketData = getTicketData();
        const ticket = ticketData[interaction.channelId];

        if (!ticket) {
            return interaction.reply({
                content: "Die Ticketdaten konnten nicht gefunden werden.",
                ephemeral: true
            });
        }

        // ==================================
        // BERECHTIGUNG PRÜFEN
        // ==================================

        const isCreator = interaction.user.id === ticket.userId;
        const isAssignedHandler =
            interaction.user.id === ticket.handlerId;

        const isAuthorized =
            isCreator ||
            isAssignedHandler ||
            isLeadership(interaction.member);

        if (!isAuthorized) {
            return interaction.reply({
                content: "Du bist nicht berechtigt, dieses Ticket zu schließen.",
                ephemeral: true
            });
        }

        if (ticket.closed) {
            return interaction.reply({
                content: "Dieses Ticket ist bereits geschlossen.",
                ephemeral: true
            });
        }

        // ==================================
        // SCHLIESSEN: BESTÄTIGUNG ANZEIGEN
        // ==================================

        if (customId === "lja_close") {

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("lja_close_confirm")
                    .setLabel("Ja, Ticket schließen")
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId("lja_close_cancel")
                    .setLabel("Abbrechen")
                    .setStyle(ButtonStyle.Secondary)
            );

            return interaction.reply({
                content:
                    "Möchtest du dieses Ticket wirklich schließen?\n" +
                    "Nach der Bestätigung wird der Kanal archiviert und der Mandant kann keine Nachrichten mehr senden.",
                components: [row],
                ephemeral: true
            });
        }

        // ==================================
        // SCHLIESSEN: ABBRECHEN
        // ==================================

        if (customId === "lja_close_cancel") {
            return interaction.update({
                content: "Das Schließen des Tickets wurde abgebrochen.",
                components: []
            });
        }

        // ==================================
        // SCHLIESSEN: BESTÄTIGEN
        // ==================================

        if (customId === "lja_close_confirm") {

            await interaction.deferUpdate();

            ticket.closed = true;

            addTicketEvent(
                ticket,
                "Ticket geschlossen und archiviert",
                interaction.user.id
            );

            saveTicketData(ticketData);

            // HTML-Transkript erstellen
            const transcript = await createHtmlTranscript(
                interaction.channel,
                ticket
            );

            // Transkript im Ticket hochladen
            await interaction.channel.send({
                content: "📁 **Ticket-Transkript:** Das vollständige Gespräch wurde archiviert.",
                files: [transcript]
            });

            // Mandanten-Schreibrechte entfernen
            await interaction.channel.permissionOverwrites.edit(
                ticket.userId,
                {
                    SendMessages: false,
                    AttachFiles: false
                }
            );

            // Ticketnachricht aktualisieren und Buttons entfernen
            await updateTicketMessage(interaction.channel, ticket);

            const ticketMessage = await interaction.channel.messages.fetch(
                ticket.messageId
            );

            await ticketMessage.edit({
                embeds: [buildTicketEmbed(ticket)],
                components: []
            });

            // Kanal umbenennen
            const archivedName = `geschlossen-${interaction.channel.name}`
                .slice(0, 100);

            await interaction.channel.setName(archivedName);

            // Bestätigung anzeigen
            await interaction.editReply({
                content: "Das Ticket wurde erfolgreich geschlossen und archiviert.",
                components: []
            });

            console.log(
                `Ticket ${ticket.ticketNumber} wurde geschlossen und archiviert.`
            );

            return;
        }

    } catch (error) {
        console.error("Fehler beim Schließen des Tickets:", error);

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "Das Ticket konnte nicht geschlossen werden.",
                ephemeral: true
            }).catch(() => {});
        }
    }
});
// ==========================================
// BOT-LOGIN
// ==========================================

if (!TOKEN) {
    console.error("Fehler: DISCORD_TOKEN wurde nicht gefunden.");
    process.exit(1);
}

client.on("error", error => console.error("Discord-Clientfehler:", error.message));
client.login(TOKEN).catch(error => { console.error("Bot-Login fehlgeschlagen:", error.message); process.exitCode = 1; });






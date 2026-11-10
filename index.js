require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    ChannelType,
    PermissionFlagsBits,
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
    EmbedBuilder
} = require("discord.js");

const fs = require("node:fs");
const path = require("node:path");

// ==========================================
// LJA KONFIGURATION
// ==========================================

const TOKEN = process.env.DISCORD_TOKEN;
console.log("Token geladen:", Boolean(TOKEN), "Länge:", TOKEN?.length ?? 0);
const CLIENT_ID = "1569762821124915274";
const GUILD_ID = "1477731363082993665";

// ==========================================
// BERECHTIGUNGEN
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

function hasAdminPermission(member) {
    return ADMIN_ROLE_IDS.some(roleId =>
        member.roles.cache.has(roleId)
    );
}

// ==========================================
// TICKETKATEGORIEN
// ==========================================

const TICKET_TYPES = {
    strafverteidigung: {
        label: "Notfall / Strafverteidigung",
        prefix: "Strafverteidigung",
        categoryId: "1478006998137176065"
    },

    amtshaftung: {
        label: "Klage gegen Staat / Amtshaftung",
        prefix: "Amtshaftung",
        categoryId: "1478007088465838274"
    },

    unternehmen: {
        label: "Verträge / Unternehmen",
        prefix: "Unternehmen",
        categoryId: "1478007300458287345"
    },

    bewerbung: {
        label: "Bewerbungen",
        prefix: "Bewerbung",
        categoryId: "1478007779867230291"
    }
};


// ==========================================
// TICKETNUMMERN SPEICHERN
// ==========================================

const COUNTER_FILE = path.join(__dirname, "ticket-counters.json");

function getNextNumber(type) {
    let counters = {};

    if (fs.existsSync(COUNTER_FILE)) {
        counters = JSON.parse(
            fs.readFileSync(COUNTER_FILE, "utf8")
        );
    }

    counters[type] = (counters[type] || 0) + 1;

    fs.writeFileSync(
        COUNTER_FILE,
        JSON.stringify(counters, null, 2)
    );

    return String(counters[type]).padStart(4, "0");
}

// ==========================================
// HILFSFUNKTIONEN
// ==========================================

function cleanName(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 25);
}

// ==========================================
// DISCORD BOT
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ==========================================
// SLASH COMMANDS
// ==========================================

const commands = [
    new SlashCommandBuilder()
        .setName("ticket-panel")
        .setDescription("Veröffentlicht das LJA-Ticket-Panel.")
        .setDefaultMemberPermissions(null)
];

// ==========================================
// COMMANDS REGISTRIEREN
// ==========================================

async function registerCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        {
            body: commands.map(command => command.toJSON())
        }
    );

    console.log("LJA-Slash-Commands registriert.");
}

// ==========================================
// BOT ONLINE
// ==========================================

client.once("ready", () => {
    console.log(
        `LJA Kanzleiverwaltung ist online als ${client.user.tag}`
    );
});

// ==========================================
// INTERAKTIONEN
// ==========================================

client.on("interactionCreate", async interaction => {
    try {

        // ======================================
        // TICKET-PANEL VERÖFFENTLICHEN
        // ======================================

        if (
            interaction.isChatInputCommand() &&
            interaction.commandName === "ticket-panel"
        ) {

            const member = await interaction.guild.members.fetch(
                interaction.user.id
            );

            if (!hasAdminPermission(member)) {
                await interaction.reply({
                    content: "Du hast keine Berechtigung für diesen Befehl.",
                    ephemeral: true
                });
                return;
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId("lja_ticket_type")
                .setPlaceholder("Ticketart auswählen")
                .addOptions(
                    {
                        label: "Notfall / Strafverteidigung",
                        value: "strafverteidigung",
                        emoji: "⚖️"
                    },
                    {
                        label: "Klage gegen Staat / Amtshaftung",
                        value: "amtshaftung",
                        emoji: "🏛️"
                    },
                    {
                        label: "Verträge / Unternehmen",
                        value: "unternehmen",
                        emoji: "📜"
                    },
                    {
                        label: "Bewerbungen",
                        value: "bewerbung",
                        emoji: "💼"
                    }
                );

            const embed = new EmbedBuilder()
                .setColor(0xC5A45A)
                .setTitle("LIBERTY JUSTICE ASSOCIATES")
                
                .setDescription(
                      "*Willkommen bei Liberty Justice Associates.*\n\n" +
                     "__Bitte wähle die passende Ticketart für dein Anliegen:__\n\n" +

                     "⚖️ **Notfall / Strafverteidigung**\n" +
                        "Anwaltliche Unterstützung bei strafrechtlichen Angelegenheiten.\n\n" +

                        "🏛️ **Klage gegen Staat / Amtshaftung**\n" +
                        "Rechtliche Anliegen und Schadensersatzforderungen gegenüber staatlichen Stellen.\n\n" +

                        "📜 **Verträge / Unternehmen**\n" +
                        "Vertragserstellung, Unternehmensberatung und rechtliche Betreuung.\n\n" +

                        "💼 **Bewerbungen**\n" +
                        "Bewerbungen und Anfragen zur Mitarbeit in der Kanzlei."
                )
                .setFooter({
                    text: "LIBERTY JUSTICE ASSOCIATES • KANZLEIVERWALTUNG"
                });

            await interaction.channel.send({
                embeds: [embed],
                components: [
                    new ActionRowBuilder().addComponents(menu)
                ],
                allowedMentions: {
                    parse: []
                }
            });

            await interaction.reply({
                content: "Das Ticket-Panel wurde erfolgreich veröffentlicht.",
                ephemeral: true
            });

            return;
        }

        // ======================================
        // TICKETART AUSWÄHLEN
        // ======================================

        if (
            interaction.isStringSelectMenu() &&
            interaction.customId === "lja_ticket_type"
        ) {

            const typeKey = interaction.values[0];
            const type = TICKET_TYPES[typeKey];

            if (!type) {
                await interaction.reply({
                    content: "Diese Ticketart existiert nicht.",
                    ephemeral: true
                });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId(`lja_form:${typeKey}`)
                .setTitle("Mandantenaufnahme");

            const fields = [
                ["first", "IC-Vorname", TextInputStyle.Short],
                ["last", "IC-Nachname", TextInputStyle.Short],
                ["birth", "Geburtsdatum (TT.MM.JJJJ)", TextInputStyle.Short],
                ["subject", "Betreff des Anliegens", TextInputStyle.Short],
                ["facts", "Was ist passiert? Sachverhalt", TextInputStyle.Paragraph]
            ];

            modal.addComponents(
                ...fields.map(([id, label, style]) =>
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId(id)
                            .setLabel(label)
                            .setStyle(style)
                            .setRequired(true)
                    )
                )
            );

            await interaction.showModal(modal);
            return;
        }

        // ======================================
        // FORMULAR ABSENDEN
        // ======================================

        if (
            interaction.isModalSubmit() &&
            interaction.customId.startsWith("lja_form:")
        ) {

            await interaction.deferReply({
                ephemeral: true
            });

            const typeKey = interaction.customId.split(":")[1];
            const type = TICKET_TYPES[typeKey];

            if (!type) {
                await interaction.editReply("Ungültige Ticketart.");
                return;
            }

            const first = interaction.fields.getTextInputValue("first").trim();
            const last = interaction.fields.getTextInputValue("last").trim();
            const birth = interaction.fields.getTextInputValue("birth").trim();
            const subject = interaction.fields.getTextInputValue("subject").trim();
            const facts = interaction.fields.getTextInputValue("facts").trim();

            const guild = interaction.guild;
            const member = await guild.members.fetch(interaction.user.id);

            // NICKNAME ÄNDERN

            try {
                await member.setNickname(
                    `${first} ${last}`.slice(0, 32),
                    "LJA – IC-Name übernommen"
                );
            } catch (error) {
                console.error("Nickname konnte nicht geändert werden:", error);
            }

            // KATEGORIE PRÜFEN

            const category = await guild.channels.fetch(type.categoryId);

            if (
                !category ||
                category.type !== ChannelType.GuildCategory
            ) {
                await interaction.editReply(
                    "Die Ticketkategorie wurde nicht gefunden."
                );
                return;
            }

            // TICKETNUMMER

            const number = getNextNumber(typeKey);

            const channelName = [
                number,
                type.prefix,
                first,
                last
            ]
                .map(cleanName)
                .join("-")
                .slice(0, 100);

            // TICKET ERSTELLEN

            const channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category.id,
                topic: `LJA-Ticket #${number} | ${type.label} | ${first} ${last}`
            });

            await channel.permissionOverwrites.edit(
                interaction.user.id,
                {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true
                }
            );

            // TICKETÜBERSICHT

            const embed = new EmbedBuilder()
                .setColor(0xC5A45A)
                .setTitle(`⚖️ Ticket #${number}`)
                .setDescription("Ein neues Mandantenticket wurde eröffnet.")
                .addFields(
                    {
                        name: "Kategorie",
                        value: type.label
                    },
                    {
                        name: "Erstellt für",
                        value: `${first} ${last}`,
                        inline: true
                    },
                    {
                        name: "Geburtsdatum",
                        value: birth,
                        inline: true
                    },
                    {
                        name: "Betreff",
                        value: subject
                    },
                    {
                        name: "DOJ-Aktenzeichen",
                        value: "Noch nicht hinterlegt"
                    },
                    {
                        name: "Hauptakte",
                        value: "Noch nicht hinterlegt"
                    },
                    {
                        name: "Vorgang",
                        value: "Noch nicht hinterlegt"
                    },
                    {
                        name: "Sachverhalt",
                        value: facts
                    },
                    {
                        name: "Bearbeitungsstatus",
                        value: "Wartet auf Übernahme"
                    }
                )
                .setFooter({
                    text: "LIBERTY JUSTICE ASSOCIATES"
                })
                .setTimestamp();

            // TICKET-SCHALTFLÄCHEN

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("lja_wait")
                    .setLabel("Warten")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("lja_claim")
                    .setLabel("Übernehmen")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("lja_release")
                    .setLabel("Freigeben")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("lja_close")
                    .setLabel("Ticket schließen")
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({
                embeds: [embed],
                components: [buttons],
                allowedMentions: {
                    parse: []
                }
            });

            await interaction.editReply(
                `Dein Ticket wurde erfolgreich erstellt: ${channel}`
            );

            return;
        }

        // ======================================
        // TICKET-SCHALTFLÄCHEN
        // ======================================

        if (
            interaction.isButton() &&
            interaction.customId.startsWith("lja_")
        ) {

            const member = await interaction.guild.members.fetch(
                interaction.user.id
            );

            if (!hasAdminPermission(member)) {
                await interaction.reply({
                    content: "Du hast keine Berechtigung für diese Aktion.",
                    ephemeral: true
                });
                return;
            }

            if (interaction.customId === "lja_close") {
                await interaction.reply(
                    "Das Ticket wird in 5 Sekunden geschlossen."
                );

                setTimeout(() => {
                    interaction.channel.delete(
                        "LJA-Ticket geschlossen"
                    ).catch(console.error);
                }, 5000);

                return;
            }

            if (interaction.customId === "lja_claim") {
                await interaction.reply(
                    `Ticket übernommen von ${interaction.user.tag}.`
                );
                return;
            }

            if (interaction.customId === "lja_release") {
                await interaction.reply(
                    `Ticket freigegeben von ${interaction.user.tag}.`
                );
                return;
            }

            if (interaction.customId === "lja_wait") {
                await interaction.reply(
                    "Das Ticket wurde auf Warten gesetzt."
                );
                return;
            }
        }

    } catch (error) {

        console.error("LJA-Ticket-System:", error);

        const message =
            "Es ist ein Fehler aufgetreten. Bitte informiere die Kanzleileitung.";

        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({
                content: message,
                ephemeral: true
            }).catch(() => {});
        } else {
            await interaction.reply({
                content: message,
                ephemeral: true
            }).catch(() => {});
        }
    }
});

// ==========================================
// BOT STARTEN
// ==========================================

(async () => {
    try {
        await registerCommands();
        await client.login(TOKEN);
    } catch (error) {
        console.error("LJA-Bot konnte nicht gestartet werden:", error);
    }
})();

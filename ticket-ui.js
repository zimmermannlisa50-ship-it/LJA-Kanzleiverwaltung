const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle}=require('discord.js');
const getTicketStatus=require('./ticket-workflow').status;
function truncate(value,maxLength=1024){const text=String(value??'');return text.length>maxLength?text.slice(0,maxLength-3)+'...':text;}
function buildTicketEmbed(ticket) {
    if(ticket.categoryKey === "bewerbung") return require("./personnel/applications-ui").embed(ticket);
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
                value: status.title + (ticket.handlerId ? `\nBearbeiter: <@${ticket.handlerId}>` : ""),
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
    if (ticket.categoryKey === "bewerbung" && !ticket.closed) return require("./personnel/ui").application(ticket);
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
            .setCustomId(require("./ticket-close").buttonId(require("./registration-store").read().instanceId || "local"))
            .setLabel("Ticket schließen")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger)
    );

    rows.push(firstRow, secondRow);
    if (["strafverteidigung", "klage", "beratung"].includes(ticket.categoryKey)) {
        const hr = require("./personnel/ui");
        rows.push(hr.row(hr.button("guestAdd", "PERSON HINZUFÜGEN", hr.ButtonStyle.Secondary, ticket.channelId), hr.button("guestRemove", "PERSON ENTFERNEN", hr.ButtonStyle.Secondary, ticket.channelId)));
    }

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


module.exports={buildTicketEmbed,buildTicketComponents};

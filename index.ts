import * as restify from 'restify';
import * as botbuilder from 'botbuilder';
import * as uuid from 'node-uuid';

const server = restify.createServer();
server.listen(process.env.port || process.env.POST || 3978, () => {
    console.log('%s is listening to %s', server.name, server.url);
});

const connector = new botbuilder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

const bot = new botbuilder.UniversalBot(connector);

server.post('api/messages', connector.listen());

bot.dialog('/', [
    (session) => {
        let card = new botbuilder
            .HeroCard(session)
            .title("Muad'Dib - Your DepotX friend.")
            .text("Avantida DepotX Request Bot - always ready to help you!")
            .images([
                 botbuilder.CardImage.create(session, "http://docs.botframework.com/images/demo_bot_image.png")
            ]);
        var msg = new botbuilder.Message(session).attachments([card]);
        session.send(msg);
        session.send("Welcome to Avantida DepotX Request guide. How can I help you?");
        session.beginDialog('/request');
    }
]);

const intents = new botbuilder.IntentDialog();
bot.dialog('/request', intents);

intents
    .matches(/drop/i, "/request/dropoff")
    .matches(/pick/i, "/request/pickup")
    .onDefault(botbuilder.DialogAction.send("Would you like to make a drop-off or pick-up request."))

bot.dialog("/request/dropoff", [
    (session) => {
        session.send("You have chosen drop off request");
        botbuilder.Prompts.text(session, "What is the container number?");
    },
    (session, result) => {
        let containerNumber = result.response; //TODO: RegExp
        session.dialogData = session.dialogData || { containerNumber: containerNumber }

        botbuilder.Prompts.text(session, "That's great, now I will ask you for an export reference.")
    },
    (session, result) => {
        let exportReference = result.response; // TODO: RegExp
        session.dialogData.exportReference = exportReference;

        botbuilder.Prompts.choice(session, "Time to select a carrier, my friend:", "MSC|Maersk|Hamburg Sud|DepotX Carrier1");
    },
    (session: botbuilder.Session, result: botbuilder.IPromptChoiceResult) => {
        let carrierName = result.response;
        // TODO: Query Db for Id
        session.dialogData.carrierName = carrierName;
        session.dialogData.carrierId = uuid.v4();

        botbuilder.Prompts.choice(session, "OK. Let me ask you about the export location for this request.", "Loc1|Loc2|Loc3");
    },
    (session: botbuilder.Session, result: botbuilder.IPromptChoiceResult) => {
        let exportLocName = result.response;

        session.dialogData.exportLocationName = exportLocName;
        session.dialogData.exportLocationId = uuid.v4();

        botbuilder.Prompts.choice(session, "Great news! I've found 5 depots for you at this location. Please select the one in which you would like to drop-off you container", "Depot1 - 4EUR|Depot2 - 12EUR|Depot3 - 10EUR|Depot4 - 11EUR|Depot5 - 8EUR");
    },
    (session: botbuilder.Session, result: botbuilder.IPromptChoiceResult) => {
        let depotName = result.response;

        session.dialogData.depotName = depotName;
        session.dialogData.depotId = uuid.v4();

        session.send("That's certainly a best choice for you.");
        botbuilder.Prompts.text(session, "Are the any comments that you would like to include when requesting the drop-off change for this container?");
    },
    (session, result) => {
        session.send("That's great. Let me sum it up for you!");
        session.send(JSON.stringify(session.dialogData));

        botbuilder.Prompts.confirm(session, "Is everything OK?");
    },
    (session, result: botbuilder.IPromptConfirmResult) => {
        if(result.response) {
            session.send("Generating a receipt for you!");

            let receipt = new botbuilder
                .ReceiptCard(session)
                .title(`Receipt for DepotX Request no ${uuid.v4()}`)
                .facts([
                    botbuilder.Fact.create(session, session.dialogData.containerNumber, "Container Number")
                ])
                .total("30EUR")
                .vat("5EUR")
                .buttons([
                    botbuilder.CardAction.dialogAction(session, "pay", JSON.stringify(session.dialogData)),
                    botbuilder.CardAction.dialogAction(session, "cancel")
                ]);

             let msg = new botbuilder.Message(session).attachments([receipt]);
            session.send(msg);    
        }
    },

]);

bot.dialog("/request/pickup", [
    (session) => {
        session.send("You have chosen pickup request");
    }
]);
import packageJson from "../../package.json" assert { type: "json" };

const ENABLE_THIS_SETTING_KEY = "enableHeritageAbilityBoosts";
const { name, title } = packageJson;

Hooks.once("init", () => {
    (game as Game).settings.register(name, ENABLE_THIS_SETTING_KEY, {
        name: (game as Game).i18n.localize(
            `${name}.${ENABLE_THIS_SETTING_KEY}`
        ),
        hint: (game as Game).i18n.localize(
            `${name}.${ENABLE_THIS_SETTING_KEY}Hint`
        ),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });
});

Hooks.on(
    "dropActorSheetData",
    async (actor, _, item: Pick<Item, "id" | "pack" | "type">) => {
        try {
            if (
                !(game as Game).settings.get(name, ENABLE_THIS_SETTING_KEY) ||
                item.type !== "Item" ||
                !item.id ||
                !item.pack ||
                !item.type
            ) {
                return true;
            }

            console.info(
                `${packageJson.name} | Checking validity for dropped item:`,
                item
            );

            const fullItem = (await (game as Game).packs
                .get(item.pack)
                ?.get(item.id)) as StoredDocument<Item>;

            if (
                !fullItem ||
                !fullItem.data ||
                (fullItem.data.type !== "ancestry" &&
                    fullItem.data.type !== "heritage")
            ) {
                console.info(
                    `${packageJson.name} | Skipping applying boosts and flaws because this isn't an ancestry or heritage`
                );
                return true;
            }

            const ancestry =
                fullItem.data.type === "ancestry"
                    ? fullItem
                    : (actor as Actor & { ancestry: Item | null }).ancestry;
            const heritage =
                fullItem.data.type === "heritage"
                    ? fullItem
                    : (actor as Actor & { heritage: Item | null }).heritage;
            if (!ancestry || !heritage) {
                console.info(
                    `${name} | Skipping applying boosts and flaws because either ancestry or heritage is unset`
                );
                return true;
            }

            const { boosts, flaws } = heritage.data.data as {
                boosts?: Record<string, unknown>;
                flaws?: Record<string, unknown>;
            };

            if (
                (!boosts ||
                    isObjectEmpty(
                        diffObject(
                            boosts,
                            ancestry.data.data["boosts"] as object
                        )
                    )) &&
                (!flaws ||
                    isObjectEmpty(
                        diffObject(flaws, ancestry.data.data["flaws"] as object)
                    ))
            ) {
                console.info(
                    `${name} | Skipping applying boosts and flaws because they're already identical:`,
                    { boosts, flaws },
                    {
                        boosts: ancestry.data.data["boosts"],
                        flaws: ancestry.data.data["flaws"],
                    }
                );
                return true;
            }

            console.info(
                `${name} | Found boosts and flaws from heritage to apply to ancestry:`,
                { boosts, flaws }
            );

            if (boosts) {
                await actor.updateEmbeddedDocuments("Item", [
                    { _id: ancestry.data._id, data: { boosts } },
                ]);
            }

            if (flaws) {
                await actor.updateEmbeddedDocuments("Item", [
                    { _id: ancestry.data._id, data: { flaws } },
                ]);
            }

            actor.render();
        } catch (error) {
            console.error(
                `${name} | error in heritage-ability-boosts script`,
                error
            );
            ui.notifications?.error(
                `${title}: ${(game as Game).i18n.localize(
                    `${name}.enableHeritageAbilityBoosts`
                )} reported: ${
                    error instanceof Error
                        ? error.message
                        : JSON.stringify(error)
                }`
            );
        } finally {
            return true;
        }
    }
);

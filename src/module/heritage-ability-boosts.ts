import { name, title } from "../../module.json";

const ENABLE_THIS_SETTING_KEY = "enableHeritageAbilityBoosts";

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
    async (
        actor,
        _,
        data: Item | { type: string; id: string; pack: string }
    ) => {
        try {
            if (
                !(game as Game).settings.get(name, ENABLE_THIS_SETTING_KEY) ||
                data.type !== "Item"
            ) {
                return true;
            }

            const fullData =
                data.pack && data.id
                    ? ((await (game as Game).packs
                          .get(data.pack)
                          ?.getDocument(data.id)) as StoredDocument<Item>)
                    : undefined;
            if (
                !fullData ||
                (fullData.data.type !== "ancestry" &&
                    fullData.data.type !== "heritage")
            ) {
                return true;
            }

            const ancestry =
                fullData.data.type === "ancestry"
                    ? fullData
                    : (actor as Actor & { ancestry: Item | null }).ancestry;
            const heritage =
                fullData.data.type === "heritage"
                    ? fullData
                    : (actor as Actor & { heritage: Item | null }).heritage;
            if (!ancestry || !heritage) {
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
                            (ancestry.data.data as any)["boosts"]
                        )
                    )) &&
                (!flaws ||
                    isObjectEmpty(
                        diffObject(flaws, (ancestry.data.data as any)["flaws"])
                    ))
            ) {
                console.info(
                    `${name} | Skipping applying boosts and flaws because they're already identical:`,
                    { boosts, flaws },
                    {
                        boosts: (ancestry.data.data as any)["boosts"],
                        flaws: (ancestry.data.data as any)["flaws"],
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

import type { BaseItem } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs";
import { name, title } from "../module.json";

const ENABLE_THIS_SETTING_KEY = "enableHeritageAbilityBoosts";

Hooks.once("init", () => {
    (game as Game).settings.register(name, ENABLE_THIS_SETTING_KEY, {
        name: (game as Game).i18n.localize(
            `${name}.enableHeritageAbilityBoosts`
        ),
        hint: (game as Game).i18n.localize(
            `${name}.enableHeritageAbilityBoostsHint`
        ),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });
});

Hooks.on("dropActorSheetData", (actor) => {
    try {
        if (!(game as Game).settings.get(name, ENABLE_THIS_SETTING_KEY)) {
            return true;
        }

        const ancestry = (actor as any).ancestry as BaseItem | null;
        const heritage = (actor as any).heritage as BaseItem | null;

        if (!ancestry || !heritage) {
            return true;
        }

        const { boosts, flaws } = heritage.data.data as Record<string, unknown>;

        if (boosts && boosts !== (ancestry.data.data as any).boosts) {
            console.info(
                "Found boosts from heritage to apply to ancestry:",
                boosts
            );
            ancestry.data.update({ data: { boosts } });
        }

        if (flaws && flaws !== (ancestry.data.data as any).flaws) {
            console.info(
                "Found flaws from heritage to apply to ancestry:",
                boosts
            );
            ancestry.data.update({ data: { flaws } });
        }
    } catch (error) {
        console.error(name, "heritage-ability-boosts", error);
        ui.notifications?.error(
            `${title}: ${(game as Game).i18n.localize(
                `${name}.enableHeritageAbilityBoosts`
            )} reported: ${
                error instanceof Error ? error.message : JSON.stringify(error)
            }`
        );
    } finally {
        return true;
    }
});

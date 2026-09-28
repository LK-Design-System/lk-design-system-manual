# LDS Manual authoring

Read README.md and docs/agent-skills/lds-manual/SKILL.md for manual work.
Core/Theme own common tokens and Callout. Manual owns --manual-* aliases and A4 composition.
Use the public Core Callout; do not restyle its internals or copy its implementation.
Keep real product material in consumer repos; examples here use synthetic data only.
Do not resize type to conceal overflow. Split at step boundaries and render again.
The source repository is public; the alpha package is not published to a registry. Remote changes and registry publishing require explicit authorization.
Do not modify sibling repos as a side effect of manual authoring.

Before reporting authoring complete, require current copy-review coverage plus layout/visual review per docs/copy-review.md. A successful PDF build alone is not completion.

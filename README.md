# Forest Wanderer VR

experimental mobile, desktop, and meta quest 3 vr game.  Catch (move into same space) an animal to make them it, then run, as animals will try to catch you.  Keep your food up or your running will slow down.  Drink water or you end.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://forestvr.lovable.app

## How to Play

- **Goal:** Catch an animal by moving into its space — that animal becomes "it." Then run, because "it" animals chase you.
- **Stay not-it as long as you can.** Your current streak and best streak show below the carrot count.
- **Food (carrots):** Carrots grow on the ground. Walk over one to add it to your backpack. Tap **Eat** (or press the eat control) to consume one and raise your food level.
  - Food above 75% → you run **faster** than the animals.
  - Food between 25–75% → you run at the **same speed** as the animals.
  - Food below 25% → you run **slower** than the animals.
  - Food hits 0 → **game over.**
- **Water:** Water slowly drains as you explore. Step into the stream or any pond to drink and refill it.
  - Water hits 0 → **game over.**
- **"It" animals:** They glow, blink on the minimap, grow to double size, and chase you. If an "it" animal catches you, it turns teal and celebrates — then you become "it" again and all animals flee.
- **Minimap:** Shows mountains, water, trees, and your location. Areas reveal as you explore (fog of war). Animals appear in explored areas; "it" animals blink red. The distance to the nearest "it" animal is shown at the bottom.
- **Tips:** Keep food up to run faster. Stop in water to drink.

## Controls

- **Desktop:** WASD / arrow keys to move, mouse to look, right-click to toggle instructions.
- **Mobile (iPhone/touch):** On-screen movement dial and buttons.
- **Meta Quest 3 VR:** Press **Enter VR** to enter the headset. Move with controllers / thumbsticks. The menu button on the controller toggles instructions.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/725ebf18-4bdb-4afc-bc8f-0431eb79e5fa).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

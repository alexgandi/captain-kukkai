# Project: "Captain & Teacher Kukkai" — A kid-friendly educational side-scroller

## Story / premise (this frames the whole game)

The hero is CAPTAIN, a brave little kid. His beloved teacher, KUKKAI, has been taken away. To rescue her, Captain must learn all the English words — each word he learns is a step closer to freeing her. Knowledge is literally his power.

- At the START of the game, Teacher Kukkai speaks to Captain and explains the mission (why he must rescue her, and that learning English words is how he does it). This is the IntroScene.  
- At the END of each level, Teacher Kukkai appears (still captured but hopeful) and gives Captain:  
  1. A short encouraging sentence (warm, teacherly, kid-friendly)  
  2. The full list of words he learned in that level (Thai \+ English, so the child reviews them all together)  
- When all levels are complete and all words learned, Captain frees Kukkai — happy ending.

## Goal

Build a 2D side-scrolling platformer (Castlevania-style movement, NOT scary) that teaches English to Thai children. Core hook: every time Captain defeats an enemy, a Thai word appears with its English translation below it, and the ENGLISH word is spoken aloud.

## Tech stack

- Phaser 3 (JavaScript) — physics, sprites, animations, camera  
- Vite as dev server / bundler  
- Plain JS (no TypeScript, keep it approachable)  
- Web Speech API (speechSynthesis) for English audio — NO audio files needed  
- Placeholder art first (colored shapes), real art later

## Characters

- CAPTAIN — the player. A cheerful, brave little kid. Simple, readable placeholder look with a consistent color so he's easy to spot.  
- TEACHER KUKKAI — appears in the intro, at the end of each level, and in the finale. Warm, kind teacher figure.  
- IMPORTANT: Captain and Kukkai are ORIGINAL fictional characters. Do NOT base their portraits on any real person or photo. Design them from scratch as cartoon/pixel-art characters.

## Talking-portrait system (reusable component)

- Build ONE reusable "dialogue" component that shows a character PORTRAIT next to a text box, used in three places: IntroScene, LevelCompleteScene, and the final rescue scene.  
- Each portrait is a simple placeholder for now (e.g. a stylized face: rounded shape, eyes, smile, warm colors for Kukkai; a little hero face for Captain), loaded from an easily-swappable image/asset key so I can replace it with real pixel-art portraits later WITHOUT changing code.  
- Dialogue supports a sequence of lines shown one after another (tap/click to advance).  
- Kukkai's lines can optionally be spoken aloud via speechSynthesis (English).

## Visual & tone direction

- Bright, cheerful, colorful — friendly cartoon, Thai temple/jungle theme  
- Enemies are CUTE, not menacing, and match their level's theme — no blood; enemies "pop" into stars/sparkles when defeated  
- Settings by level: jungle/temple, floating market, temple festival

## The educational core (most important feature)

- Each enemy is tied to a vocabulary word from that level's theme  
- On defeat: enemy pops, a card appears showing:  
  - The Thai word (large, top) — this is what the child must LEARN TO READ  
  - English translation (below)  
  - Romanization (small, optional helper) and the ENGLISH word is spoken aloud via speechSynthesis  
- IMPORTANT: audio is English ONLY. Thai appears as text only (the child must recognize the Thai script visually). Do not synthesize Thai speech.  
- END-OF-LEVEL RECAP: Teacher Kukkai shows an encouraging sentence \+ the full list of that level's words (Thai \+ English). Child can tap each word to hear the English again.  
- Collected words also live in a persistent "Word Book" the child can review anytime.

## Vocabulary data (use this exact starting content for /src/data/vocabulary.json)

Structure each entry: { thai, english, romanization, theme, level } Difficulty grows: Level 1 has 6 words, Level 2 has 8, Level 3 has 10\. No word repeats across levels.

Level 1 — theme "animals" (jungle/temple) — 6 words: ช้าง / elephant / cháang ลิง / monkey / ling นก / bird / nók ปลา / fish / plaa เสือ / tiger / sʉ̌a งู / snake / nguu

Level 2 — theme "food" (floating market) — 8 words: มะม่วง / mango / má-mûang ข้าว / rice / kâao มะพร้าว / coconut / má-práao ไก่ / chicken / gài กล้วย / banana / glûay ไข่ / egg / kài น้ำ / water / náam ส้ม / orange / sôm

Level 3 — theme "colors\_numbers" (temple festival) — 10 words: แดง / red / daaeng เขียว / green / kǐao เหลือง / yellow / lʉ̌ang น้ำเงิน / blue / nám-ngəən ขาว / white / kǎao หนึ่ง / one / nʉ̀ng สอง / two / sɔ̌ɔng สาม / three / sǎam สี่ / four / sìi ห้า / five / hâa

- Each enemy in a level pulls from that level's word pool. Map specific enemy types to specific words (the monkey enemy teaches "monkey/ลิง", the coconut enemy teaches "coconut/มะพร้าว") so the visual and the word reinforce each other.  
- A level is "complete" when Captain has learned all of that level's words.

## Kukkai's dialogue (use this exact text)

### IntroScene (start of game):

"Hello, Captain\! I am Teacher Kukkai." "Oh no\! I am lost. You must help me\!" "Learn the English words to set me free." "Every word makes you stronger. You can do it\!" "Let's go, Captain\! Be brave\!"

### End of Level 1 (animals):

"Wonderful, Captain\! You learned the animals\!" "Elephant, monkey, bird, fish, tiger, snake — well done\!" "You are getting stronger. Keep going\!"

### End of Level 2 (food):

"Amazing work, Captain\! So much yummy food\!" "Mango, rice, coconut, chicken, banana, egg, water, orange — perfect\!" "You are so close now. I believe in you\!"

### End of Level 3 (colors & numbers) — final level:

"You did it, Captain\! You are a hero\!" "Red, green, yellow, blue, white — one, two, three, four, five — brilliant\!" "You learned all the words. Now I am free\! Thank you\!"

## Combat progression (unlocks by level — gives kids a reason to advance)

- Level 1: jump-on-head only (gentle, intuitive for youngest kids)  
- Level 2+: sword unlocked (simple melee attack \+ hitbox)  
- Level 3+: ranged "magic blast" unlocked (kid-friendly glowing star/projectile, NOT a realistic firearm)  
- Design the combat system so new attack types plug in cleanly — the player has a list of "available attacks" gated by current level/progress

## Architecture — set this up cleanly from the start

- /src /scenes      (BootScene, MenuScene, IntroScene, GameScene, LevelCompleteScene, WordBookScene, RescueScene) /entities    (Player, Enemy, base classes) /systems     (physics config, VocabularyManager, AudioManager, AttackManager, ProgressManager) /ui          (DialoguePortrait — the reusable talking-portrait component) /data        (vocabulary.json)  
- Vocabulary lives in a separate JSON file so I can add words without touching game code  
- VocabularyManager loads the JSON, serves words per level, tracks collected words  
- AudioManager wraps speechSynthesis (English, child-friendly rate/pitch)  
- AttackManager owns which attacks are unlocked and handles hit detection  
- ProgressManager tracks which words/levels are done and drives the end-of-level recap and the final rescue  
- DialoguePortrait renders a character portrait \+ sequential text lines, reused by IntroScene, LevelCompleteScene, and RescueScene

## Build in THIS order — one step per session, don't do it all at once

1. Project scaffold (Vite \+ Phaser), empty scene, Captain rectangle on screen  
2. Left/right movement \+ gravity \+ jump that "feels good" on a flat floor  
3. Multiple platforms \+ solid collision  
4. One static cute enemy \+ jump-on-head defeat \+ "pop" effect  
5. Vocabulary card system on defeat (read from JSON) \+ English speech via speechSynthesis  
6. Sprite animations \+ placeholder art swap (Captain \+ one enemy)  
7. Scrolling camera \+ one longer Level 1 (animals theme)  
8. Patrolling enemies (simple AI), each mapped to a word  
9. DialoguePortrait component \+ IntroScene (Kukkai explains the mission)  
10. LevelCompleteScene: Kukkai's encouragement \+ word recap (tap to re-hear)  
11. AttackManager \+ sword (Level 2\) and magic blast (Level 3), unlock logic  
12. Word Book review screen (re-hear English words anytime)  
13. RescueScene: all levels done → free Kukkai (happy ending)  
14. Polish: gentle lives system (hearts, friendly "try again" — no scary game over), menu, sound

## Constraints

- Keep every system modular and commented — I'm learning, explain key decisions  
- After each step, give me a working, runnable build before moving on  
- Prioritize: jump feel, the vocabulary card moment, clean audio playback, and the Kukkai dialogue moments (intro \+ recaps \+ rescue)  
- Start each new attack type as a small isolated module  
- Captain and Kukkai are original characters — never based on real people/photos

## Start now with STEP 1 only.

Scaffold the project, get Captain (a rectangle) rendering on screen, and tell me exactly which commands to run. Wait for me to confirm it works before Step 2\.  

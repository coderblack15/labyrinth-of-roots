// Labyrinth of Roots: languages
// ------------------------------------------------------------------
// This file adds a Language switch to Settings and translates the game's
// menus, buttons, sheet labels and title screens. The story is translated
// chapter by chapter in lang/story-*.js (Chapter 1 so far).
//
// How it works: every bit of on-screen text outside the story is checked
// against the TABLE below. If the English matches a row, it is swapped for
// the chosen language. Switching back to English puts the original text back.
// Nothing in the game's own code needs to know about languages.
//
// To add a language: add its code to LANGS, then add one more column to
// every row of TABLE (and to PATTERNS and UI). The check at the bottom
// warns in the console if a row is missing a column.
//
// To add a string: add a row. The first column is the exact English text as
// it appears on screen (spaces at the ends don't matter).
//
// After editing, run:  python3 tools/build-languages.py
// That copies this file into index.html so the game stays a single file,
// then rebuild the demo with tools/build-demo.py as usual.
// ------------------------------------------------------------------
(function () {
  "use strict";

  const STORE = "labyrinth-of-roots-lang";

  // Column order for every row below.
  const LANGS = [
    ["en", "English"],
    ["es", "Español"],
    ["fr", "Français"],
    ["de", "Deutsch"],
    ["pt", "Português"],
    ["ja", "日本語"],
  ];

  // Words for the Language row in Settings.
  const UI = {
    label: ["Language", "Idioma", "Langue", "Sprache", "Idioma", "言語"],
    close: ["Close", "Cerrar", "Fermer", "Schließen", "Fechar", "閉じる"],
    note: [
      "Menus, title screens and the first chapter's story change language. Later chapters are still told in English for now.",
      "Cambia el idioma de los menús, las pantallas de inicio y la historia del primer capítulo. Los capítulos siguientes siguen en inglés por ahora.",
      "Change la langue des menus, des écrans d'accueil et de l'histoire du premier chapitre. Les chapitres suivants restent en anglais pour l'instant.",
      "Ändert die Sprache von Menüs, Startbildschirmen und der Geschichte des ersten Kapitels. Spätere Kapitel sind vorerst noch auf Englisch.",
      "Muda o idioma dos menus, das telas iniciais e da história do primeiro capítulo. Os capítulos seguintes continuam em inglês por enquanto.",
      "メニュー、タイトル画面、物語の言語を切り替えます。物語は第12章まで日本語です。以降の章は今のところ英語のままです。",
    ],
  };

  // Text that has numbers or names in it. $1, $2 are the parts that carry over.
  const PATTERNS = [
    [/^Battle style · Slot (\d+)$/, "Battle style · Slot $1", "Estilo de combate · Ranura $1", "Style de combat · Emplacement $1", "Kampfstil · Platz $1", "Estilo de batalha · Espaço $1", "戦闘スタイル · スロット$1"],
    [/^Slot (\d+)( · .*)?$/, "Slot $1$2", "Ranura $1$2", "Emplacement $1$2", "Platz $1$2", "Espaço $1$2", "スロット$1$2"],
    [/^Part ([IVXLCDM]+) · (.+)$/, "Part $1 · $2", "Parte $1 · $2", "Partie $1 · $2", "Teil $1 · $2", "Parte $1 · $2", "パート$1 · $2"],
    [/^Level (\d+) adventurer · next milestone at (\d+)(, the Cascades)?$/, "Level $1 adventurer · next milestone at $2$3", "Aventurero de nivel $1 · próximo hito: nivel $2$3", "Aventurier de niveau $1 · prochain palier : niveau $2$3", "Abenteurer der Stufe $1 · nächster Meilenstein: Stufe $2$3", "Aventureiro de nível $1 · próximo marco: nível $2$3", "レベル$1の冒険者 · 次の節目はレベル$2$3"],
    [/^Level (\d+) adventurer \(the most there is\)$/, "Level $1 adventurer (the most there is)", "Aventurero de nivel $1 (el máximo)", "Aventurier de niveau $1 (le maximum)", "Abenteurer der Stufe $1 (das Höchste)", "Aventureiro de nível $1 (o máximo)", "レベル$1の冒険者（最大）"],
    [/^Level (\d+) adventurer$/,"Level $1 adventurer", "Aventurero de nivel $1", "Aventurier de niveau $1", "Abenteurer der Stufe $1", "Aventureiro de nível $1", "レベル$1の冒険者"],
    [/^Day (\d+)$/, "Day $1", "Día $1", "Jour $1", "Tag $1", "Dia $1", "$1日目"],
  ];

  // English | Español | Français | Deutsch | Português | 日本語
  const TABLE = [
    // ---- the warning at the gate ----
    ["WARNING", "ADVERTENCIA", "AVERTISSEMENT", "WARNUNG", "AVISO", "警告"],
    ["The stories say the labyrinth was sealed.", "Las historias dicen que el laberinto fue sellado.", "Les récits disent que le labyrinthe a été scellé.", "Die Geschichten sagen, das Labyrinth sei versiegelt worden.", "As histórias dizem que o labirinto foi selado.", "言い伝えでは、迷宮は封じられたという。"],
    ["The stories are wrong.", "Las historias se equivocan.", "Les récits se trompent.", "Die Geschichten irren.", "As histórias estão erradas.", "言い伝えは間違っている。"],
    ["ENTER", "ENTRAR", "ENTRER", "EINTRETEN", "ENTRAR", "入る"],

    // ---- the landing page ----
    ["A Dark Fantasy Horror Adventure", "Una aventura de terror y fantasía oscura", "Une aventure d'horreur et de dark fantasy", "Ein Dark-Fantasy-Horror-Abenteuer", "Uma aventura de terror e fantasia sombria", "ダークファンタジー・ホラーアドベンチャー"],
    ["You Were Expected.", "Te estábamos esperando.", "On vous attendait.", "Man hat dich erwartet.", "Você era esperado.", "お前を待っていた。"],
    ["Beneath an abandoned ceremonial road lies a labyrinth erased from maps, memories, and history itself.", "Bajo un camino ceremonial abandonado yace un laberinto borrado de los mapas, de la memoria y de la propia historia.", "Sous une route cérémonielle abandonnée s'étend un labyrinthe effacé des cartes, des mémoires et de l'histoire elle-même.", "Unter einer verlassenen Zeremonienstraße liegt ein Labyrinth, getilgt aus Karten, Erinnerungen und der Geschichte selbst.", "Sob uma estrada cerimonial abandonada jaz um labirinto apagado dos mapas, das memórias e da própria história.", "打ち捨てられた儀式の道の下に、地図からも記憶からも歴史からも消された迷宮が眠っている。"],
    ["ENTER THE LABYRINTH", "ENTRA EN EL LABERINTO", "ENTREZ DANS LE LABYRINTHE", "BETRITT DAS LABYRINTH", "ENTRE NO LABIRINTO", "迷宮へ入る"],
    ["Created by: Adrian Blackshire and Claude", "Creado por: Adrian Blackshire y Claude", "Créé par : Adrian Blackshire et Claude", "Erschaffen von: Adrian Blackshire und Claude", "Criado por: Adrian Blackshire e Claude", "制作：Adrian Blackshire と Claude"],
    ["Descend Into The Dark", "Desciende a la oscuridad", "Descendez dans les ténèbres", "Steig hinab in die Dunkelheit", "Desça à escuridão", "闇へ降りよ"],
    ["Far beneath the earth, living roots twist through forgotten halls, sealed crypts, and ruined shrines. Ancient stone corridors pulse with unnatural growth. Every path stretches deeper than it should.", "Muy por debajo de la tierra, raíces vivas se retuercen por salones olvidados, criptas selladas y santuarios en ruinas. Antiguos pasillos de piedra laten con un crecimiento antinatural. Cada camino se adentra más de lo que debería.", "Loin sous la terre, des racines vivantes serpentent à travers des salles oubliées, des cryptes scellées et des sanctuaires en ruine. D'antiques couloirs de pierre palpitent d'une croissance contre nature. Chaque chemin s'enfonce plus loin qu'il ne le devrait.", "Tief unter der Erde winden sich lebende Wurzeln durch vergessene Hallen, versiegelte Grüfte und zerfallene Schreine. Uralte Steingänge pulsieren vor widernatürlichem Wuchs. Jeder Pfad reicht tiefer, als er sollte.", "Muito abaixo da terra, raízes vivas se retorcem por salões esquecidos, criptas seladas e santuários em ruínas. Antigos corredores de pedra pulsam com um crescimento antinatural. Cada caminho vai mais fundo do que deveria.", "地の底深く、生きた根が忘れられた広間や封じられた墓所、崩れた祠をうねり抜ける。古い石の回廊は不自然な成長に脈打ち、どの道も本来より深く続いている。"],
    ["Travellers have vanished here for centuries. Explorers, thieves, pilgrims, scholars. None returned unchanged.", "Durante siglos, los viajeros han desaparecido aquí. Exploradores, ladrones, peregrinos, eruditos. Ninguno volvió igual.", "Depuis des siècles, des voyageurs disparaissent ici. Explorateurs, voleurs, pèlerins, érudits. Aucun n'en est revenu inchangé.", "Seit Jahrhunderten verschwinden hier Reisende. Entdecker, Diebe, Pilger, Gelehrte. Keiner kehrte unverändert zurück.", "Há séculos viajantes desaparecem aqui. Exploradores, ladrões, peregrinos, estudiosos. Nenhum voltou o mesmo.", "何世紀ものあいだ、旅人たちはここで姿を消してきた。探検家、盗賊、巡礼者、学者。誰ひとり元のままでは戻らなかった。"],
    ["Tonight, you follow them.", "Esta noche, tú los sigues.", "Ce soir, vous les suivez.", "Heute Nacht folgst du ihnen.", "Esta noite, você os segue.", "今夜、お前も彼らの後を追う。"],
    ["The Labyrinth Is Alive", "El laberinto está vivo", "Le labyrinthe est vivant", "Das Labyrinth lebt", "O labirinto está vivo", "迷宮は生きている"],
    ["It Watches", "Observa", "Il observe", "Es beobachtet", "Ele observa", "見ている"],
    ["Every corridor shifts. Every shadow lingers too long. Something notices each step you take.", "Cada pasillo cambia. Cada sombra se demora demasiado. Algo nota cada paso que das.", "Chaque couloir se déplace. Chaque ombre s'attarde trop longtemps. Quelque chose remarque chacun de vos pas.", "Jeder Gang verschiebt sich. Jeder Schatten verweilt zu lange. Etwas bemerkt jeden deiner Schritte.", "Cada corredor muda. Cada sombra se demora demais. Algo nota cada passo que você dá.", "回廊は形を変え、影は長く居座る。何かがお前の一歩一歩に気づいている。"],
    ["It Remembers", "Recuerda", "Il se souvient", "Es erinnert sich", "Ele lembra", "覚えている"],
    ["The roots carry echoes of everyone who entered before you. Some whispers are warnings. Others are traps.", "Las raíces guardan ecos de todos los que entraron antes que tú. Algunos susurros son advertencias. Otros son trampas.", "Les racines portent l'écho de tous ceux qui sont entrés avant vous. Certains murmures sont des avertissements. D'autres sont des pièges.", "Die Wurzeln tragen die Echos aller, die vor dir eintraten. Manches Flüstern ist eine Warnung. Anderes eine Falle.", "As raízes carregam ecos de todos que entraram antes de você. Alguns sussurros são avisos. Outros são armadilhas.", "根は、お前より先に入った者すべての残響を宿している。ある囁きは警告であり、ある囁きは罠だ。"],
    ["It Hungers", "Tiene hambre", "Il a faim", "Es hungert", "Ele tem fome", "飢えている"],
    ["The deeper you descend, the harder it becomes to remember why you came.", "Cuanto más desciendes, más difícil es recordar por qué viniste.", "Plus vous descendez, plus il devient difficile de vous rappeler pourquoi vous êtes venu.", "Je tiefer du hinabsteigst, desto schwerer fällt es, dich zu erinnern, warum du gekommen bist.", "Quanto mais fundo você desce, mais difícil fica lembrar por que veio.", "深く降りるほど、なぜ来たのかを思い出すのが難しくなる。"],
    ["Features", "Características", "Caractéristiques", "Merkmale", "Recursos", "特徴"],
    ["Explore", "Explora", "Explorez", "Erkunde", "Explore", "探索"],
    ["Navigate a living labyrinth filled with hidden chambers, druidic relics, and forgotten horrors.", "Recorre un laberinto vivo lleno de cámaras ocultas, reliquias druídicas y horrores olvidados.", "Parcourez un labyrinthe vivant rempli de chambres cachées, de reliques druidiques et d'horreurs oubliées.", "Durchstreife ein lebendes Labyrinth voller verborgener Kammern, druidischer Relikte und vergessener Schrecken.", "Navegue por um labirinto vivo cheio de câmaras ocultas, relíquias druídicas e horrores esquecidos.", "隠し部屋、ドルイドの遺物、忘れられた恐怖に満ちた生きた迷宮を進め。"],
    ["Choose", "Elige", "Choisissez", "Entscheide", "Escolha", "選択"],
    ["Every decision alters the journey. Trust, fear, courage, and desperation shape your fate.", "Cada decisión altera el viaje. La confianza, el miedo, el valor y la desesperación forjan tu destino.", "Chaque décision change le voyage. Confiance, peur, courage et désespoir façonnent votre destin.", "Jede Entscheidung verändert die Reise. Vertrauen, Angst, Mut und Verzweiflung formen dein Schicksal.", "Cada decisão altera a jornada. Confiança, medo, coragem e desespero moldam o seu destino.", "あらゆる決断が旅を変える。信頼、恐怖、勇気、そして絶望が運命を形づくる。"],
    ["Roll", "Tira", "Lancez", "Würfle", "Role", "ダイス"],
    ["Face dangerous encounters using dice-based skill checks, combat, and survival mechanics.", "Enfréntate a encuentros peligrosos con pruebas de habilidad a dados, combate y mecánicas de supervivencia.", "Affrontez des rencontres dangereuses avec des tests de compétence aux dés, des combats et des mécaniques de survie.", "Stelle dich gefährlichen Begegnungen mit Würfelproben, Kämpfen und Überlebensmechaniken.", "Enfrente encontros perigosos com testes de perícia nos dados, combate e mecânicas de sobrevivência.", "ダイスによる技能判定、戦闘、サバイバルで危険な遭遇に立ち向かえ。"],
    ["Survive", "Sobrevive", "Survivez", "Überlebe", "Sobreviva", "生存"],
    ["Ancient guardians, root-born horrors, and things far older than humanity wait below.", "Guardianes antiguos, horrores nacidos de las raíces y cosas mucho más viejas que la humanidad esperan abajo.", "Gardiens antiques, horreurs nées des racines et choses bien plus vieilles que l'humanité attendent en bas.", "Uralte Wächter, wurzelgeborene Schrecken und Dinge, weit älter als die Menschheit, warten dort unten.", "Guardiões antigos, horrores nascidos das raízes e coisas muito mais velhas que a humanidade esperam lá embaixo.", "古の守護者、根から生まれた怪物、そして人類よりはるかに古いものたちが下で待っている。"],
    ["“The first sound you'll hear is your own heartbeat. The second belongs to something else.”", "«El primer sonido que oirás será tu propio latido. El segundo pertenece a otra cosa.»", "« Le premier son que vous entendrez sera votre propre cœur. Le second appartient à autre chose. »", "„Das erste Geräusch, das du hörst, ist dein eigener Herzschlag. Das zweite gehört etwas anderem.“", "“O primeiro som que você ouvirá é o seu próprio coração. O segundo pertence a outra coisa.”", "「最初に聞こえるのは自分の鼓動だ。二つ目は、別の何かのものだ。」"],
    ["The Warning", "La advertencia", "L'avertissement", "Die Warnung", "O aviso", "警告"],
    ["Every story begins the same way.", "Todas las historias empiezan igual.", "Chaque histoire commence de la même façon.", "Jede Geschichte beginnt gleich.", "Toda história começa do mesmo jeito.", "どの物語も同じように始まる。"],
    ["A traveller reaches the gate.", "Un viajero llega a la puerta.", "Un voyageur atteint la porte.", "Ein Reisender erreicht das Tor.", "Um viajante chega ao portão.", "旅人が門にたどり着く。"],
    ["A voice whispers:", "Una voz susurra:", "Une voix murmure :", "Eine Stimme flüstert:", "Uma voz sussurra:", "声が囁く。"],
    ["Turn Back.", "Da la vuelta.", "Faites demi-tour.", "Kehr um.", "Volte.", "引き返せ。"],
    ["Nobody ever listens.", "Nadie hace caso nunca.", "Personne n'écoute jamais.", "Niemand hört je darauf.", "Ninguém nunca escuta.", "誰も耳を貸さない。"],
    ["PLAY NOW", "JUGAR AHORA", "JOUER", "JETZT SPIELEN", "JOGAR AGORA", "今すぐプレイ"],
    ["Free to play", "Gratis", "Gratuit", "Kostenlos", "Grátis", "無料"],
    ["Keep The Lantern Lit", "Mantén la linterna encendida", "Gardez la lanterne allumée", "Halte die Laterne am Brennen", "Mantenha a lanterna acesa", "灯を絶やさずに"],
    ["Labyrinth of Roots is free, and new chapters keep coming. If the dark has given you a good night or two, you can leave a coin at the gate to help the next chapter get written.", "Labyrinth of Roots es gratis y siguen llegando capítulos nuevos. Si la oscuridad te ha dado una o dos buenas noches, puedes dejar una moneda en la puerta para ayudar a escribir el próximo capítulo.", "Labyrinth of Roots est gratuit, et de nouveaux chapitres continuent d'arriver. Si les ténèbres vous ont offert une bonne nuit ou deux, vous pouvez laisser une pièce à la porte pour aider à écrire le prochain chapitre.", "Labyrinth of Roots ist kostenlos, und es kommen weiter neue Kapitel. Wenn dir die Dunkelheit ein, zwei gute Nächte beschert hat, kannst du am Tor eine Münze hinterlassen, damit das nächste Kapitel geschrieben wird.", "Labyrinth of Roots é grátis, e novos capítulos continuam chegando. Se a escuridão lhe rendeu uma ou duas boas noites, você pode deixar uma moeda no portão para ajudar a escrever o próximo capítulo.", "Labyrinth of Roots は無料で、新しい章も増え続けています。闇が楽しい夜をくれたなら、門に硬貨を一枚置いて次の章を後押ししてください。"],
    ["SUPPORT THE CREATOR", "APOYA AL CREADOR", "SOUTENIR LE CRÉATEUR", "UNTERSTÜTZE DEN ERSCHAFFER", "APOIE O CRIADOR", "制作者を支援する"],
    ["Every tip goes to the creator. The game stays free either way.", "Cada propina va al creador. El juego sigue siendo gratis de todos modos.", "Chaque pourboire va au créateur. Le jeu reste gratuit dans tous les cas.", "Jedes Trinkgeld geht an den Erschaffer. Das Spiel bleibt so oder so kostenlos.", "Toda gorjeta vai para o criador. O jogo continua grátis de qualquer forma.", "支援はすべて制作者に届きます。どちらにしてもゲームは無料のままです。"],

    // ---- the start screen ----
    ["An adventure in over a hundred parts · d20", "Una aventura en más de cien partes · d20", "Une aventure en plus de cent parties · d20", "Ein Abenteuer in über hundert Teilen · d20", "Uma aventura em mais de cem partes · d20", "百を超えるパートの冒険 · d20"],
    ["Before You Go Down", "Antes de bajar", "Avant de descendre", "Bevor du hinabsteigst", "Antes de descer", "降りる前に"],
    ["Far below an old ceremonial road lies a labyrinth grown from living roots, carved with druidic runes and guarded long ago by a warden named Vaelric. Travelers say nothing that goes down there comes back up. You are a lone adventurer with a pack, a belt knife and a flint, and you are going down anyway.", "Muy por debajo de un viejo camino ceremonial yace un laberinto crecido de raíces vivas, tallado con runas druídicas y custodiado hace mucho por un guardián llamado Vaelric. Los viajeros dicen que nada de lo que baja vuelve a subir. Eres un aventurero solitario con una mochila, un cuchillo al cinto y un pedernal, y vas a bajar de todos modos.", "Loin sous une vieille route cérémonielle s'étend un labyrinthe né de racines vivantes, gravé de runes druidiques et gardé jadis par un gardien nommé Vaelric. Les voyageurs disent que rien de ce qui y descend ne remonte. Vous êtes un aventurier solitaire avec un sac, un couteau de ceinture et un silex, et vous descendez quand même.", "Tief unter einer alten Zeremonienstraße liegt ein Labyrinth aus lebenden Wurzeln, mit druidischen Runen beschnitzt und einst von einem Wächter namens Vaelric gehütet. Reisende sagen, nichts, was dort hinabsteigt, kommt je wieder herauf. Du bist ein einsamer Abenteurer mit einem Rucksack, einem Gürtelmesser und einem Feuerstein, und du steigst trotzdem hinab.", "Muito abaixo de uma velha estrada cerimonial jaz um labirinto nascido de raízes vivas, entalhado com runas druídicas e guardado há muito tempo por um guardião chamado Vaelric. Os viajantes dizem que nada que desce ali volta a subir. Você é um aventureiro solitário com uma mochila, uma faca de cinto e uma pederneira, e vai descer mesmo assim.", "古い儀式の道のはるか下に、生きた根から育った迷宮がある。ドルイドのルーンが刻まれ、遠い昔ヴァエルリックという番人に守られていた。旅人たちは、そこへ降りたものは二度と上がってこないと言う。お前は背嚢とベルトナイフと火打ち石だけを持つ孤独な冒険者だ。それでも降りていく。"],
    ["Read each scene, then pick what you do next.", "Lee cada escena y elige qué haces a continuación.", "Lisez chaque scène, puis choisissez votre prochaine action.", "Lies jede Szene und wähle dann, was du als Nächstes tust.", "Leia cada cena e escolha o que fazer em seguida.", "各場面を読み、次の行動を選びます。"],
    ["When a check comes up, roll the d20. Your bonus is added, and you need to meet or beat the number shown.", "Cuando llegue una prueba, tira el d20. Se suma tu bonificación, y debes igualar o superar el número indicado.", "Quand un test se présente, lancez le d20. Votre bonus s'ajoute, et vous devez égaler ou dépasser le nombre affiché.", "Wenn eine Probe ansteht, würfle den W20. Dein Bonus wird addiert, und du musst die angezeigte Zahl erreichen oder übertreffen.", "Quando surgir um teste, role o d20. Seu bônus é somado, e você precisa igualar ou superar o número mostrado.", "判定が来たらd20を振ります。ボーナスが加算され、表示された数値以上なら成功です。"],
    ["New here? Pick", "¿Eres nuevo? Elige", "Nouveau ? Choisissez", "Neu hier? Wähle", "É novo aqui? Escolha", "初めてなら、始めるときに"],
    ["Guide me", "Guíame", "Guidez-moi", "Führ mich", "Me guie", "ガイドあり"],
    ["when you begin, and the game explains each thing the first time it turns up. Your progress saves itself in this browser.", "al empezar, y el juego te explicará cada cosa la primera vez que aparezca. Tu progreso se guarda solo en este navegador.", "au début, et le jeu explique chaque chose la première fois qu'elle apparaît. Votre progression s'enregistre d'elle-même dans ce navigateur.", "zu Beginn, und das Spiel erklärt dir alles, wenn es zum ersten Mal auftaucht. Dein Fortschritt speichert sich in diesem Browser von selbst.", "ao começar, e o jogo explica cada coisa na primeira vez que ela aparecer. Seu progresso é salvo sozinho neste navegador.", "を選びましょう。各要素が初めて登場したときに説明が入ります。進行状況はこのブラウザに自動で保存されます。"],
    ["How it all works", "Cómo funciona todo", "Comment tout fonctionne", "So funktioniert alles", "Como tudo funciona", "遊び方の詳細"],
    ["Begin the descent", "Comenzar el descenso", "Commencer la descente", "Den Abstieg beginnen", "Começar a descida", "降下を始める"],
    ["Sound: off", "Sonido: apagado", "Son : coupé", "Ton: aus", "Som: desligado", "サウンド：オフ"],
    ["Sound: on", "Sonido: encendido", "Son : activé", "Ton: an", "Som: ligado", "サウンド：オン"],
    ["Settings", "Ajustes", "Paramètres", "Einstellungen", "Configurações", "設定"],
    ["Your journal", "Tu diario", "Votre journal", "Dein Tagebuch", "Seu diário", "日誌"],
    ["The Proving Ground", "El Campo de Pruebas", "Le Terrain d'Épreuve", "Der Prüfplatz", "O Campo de Provas", "試しの場"],
    ["Save slots", "Ranuras de guardado", "Emplacements de sauvegarde", "Speicherplätze", "Espaços de salvamento", "セーブスロット"],
    ["Empty", "Vacía", "Vide", "Leer", "Vazio", "空き"],
    ["A fresh descent", "Un descenso nuevo", "Une nouvelle descente", "Ein frischer Abstieg", "Uma nova descida", "新たな降下"],
    ["Continue", "Continuar", "Continuer", "Fortsetzen", "Continuar", "続ける"],
    ["New descent", "Nuevo descenso", "Nouvelle descente", "Neuer Abstieg", "Nova descida", "新しく降りる"],
    ["Erase", "Borrar", "Effacer", "Löschen", "Apagar", "消去"],
    ["Begin here", "Empezar aquí", "Commencer ici", "Hier beginnen", "Começar aqui", "ここから始める"],
    ["Tap again to overwrite", "Toca otra vez para sobrescribir", "Touchez encore pour écraser", "Nochmal tippen zum Überschreiben", "Toque de novo para substituir", "もう一度タップで上書き"],
    ["Tap again to erase", "Toca otra vez para borrar", "Touchez encore pour effacer", "Nochmal tippen zum Löschen", "Toque de novo para apagar", "もう一度タップで消去"],
    ["The end of the demo", "El final de la demo", "La fin de la démo", "Das Ende der Demo", "O fim da demo", "体験版の終わり"],

    // ---- the character sheet and its buttons ----
    ["Character sheet", "Hoja de personaje", "Fiche de personnage", "Charakterbogen", "Ficha de personagem", "キャラクターシート"],
    ["HP", "PV", "PV", "LP", "PV", "HP"],
    ["Armor class", "Clase de armadura", "Classe d'armure", "Rüstungsklasse", "Classe de armadura", "アーマークラス"],
    ["Purse", "Bolsa", "Bourse", "Geldbeutel", "Bolsa", "財布"],
    ["Level", "Nivel", "Niveau", "Stufe", "Nível", "レベル"],
    ["Experience", "Experiencia", "Expérience", "Erfahrung", "Experiência", "経験値"],
    ["Water", "Agua", "Eau", "Wasser", "Água", "水"],
    ["Food", "Comida", "Nourriture", "Nahrung", "Comida", "食料"],
    ["Exhaustion", "Agotamiento", "Épuisement", "Erschöpfung", "Exaustão", "疲労"],
    ["Time", "Tiempo", "Temps", "Zeit", "Tempo", "時間"],
    ["Weather", "Clima", "Météo", "Wetter", "Clima", "天候"],
    ["Combo", "Combo", "Combo", "Kombo", "Combo", "コンボ"],
    ["Dread", "Pavor", "Effroi", "Grauen", "Pavor", "恐怖"],
    ["Item", "Objeto", "Objet", "Gegenstand", "Item", "アイテム"],
    ["Enemy health", "Salud del enemigo", "Santé de l'ennemi", "Gegnergesundheit", "Vida do inimigo", "敵の体力"],
    ["Bag", "Bolsa", "Sac", "Beutel", "Bolsa", "袋"],
    ["Saves", "Partidas", "Sauvegardes", "Spielstände", "Jogos salvos", "セーブ"],
    ["Map", "Mapa", "Carte", "Karte", "Mapa", "地図"],
    ["Journal", "Diario", "Journal", "Tagebuch", "Diário", "日誌"],
    ["Close", "Cerrar", "Fermer", "Schließen", "Fechar", "閉じる"],
    ["Close items", "Cerrar objetos", "Fermer les objets", "Gegenstände schließen", "Fechar itens", "持ち物を閉じる"],
    ["Start over", "Empezar de nuevo", "Recommencer", "Neu anfangen", "Recomeçar", "最初から"],
    ["The Realm", "El Reino", "Le Royaume", "Das Reich", "O Reino", "王国"],
    ["Sound, text size, notes and how fights play", "Sonido, tamaño del texto, notas y cómo se juegan los combates", "Son, taille du texte, notes et déroulement des combats", "Ton, Textgröße, Hinweise und wie Kämpfe ablaufen", "Som, tamanho do texto, notas e como as lutas funcionam", "サウンド、文字サイズ、ヒント、戦闘の遊び方"],
    ["Go back to your save slots. You'll pick up from the start of this part.", "Vuelve a tus ranuras de guardado. Retomarás desde el inicio de esta parte.", "Revenez à vos emplacements de sauvegarde. Vous reprendrez au début de cette partie.", "Zurück zu deinen Speicherplätzen. Du machst am Anfang dieses Teils weiter.", "Volte aos seus espaços de salvamento. Você retoma do início desta parte.", "セーブスロットに戻ります。このパートの最初から再開します。"],
    ["Your map of the realm", "Tu mapa del reino", "Votre carte du royaume", "Deine Karte des Reichs", "Seu mapa do reino", "王国の地図"],
    ["The bag goes down further than your arm can reach. Nothing you put in it has ever been lost.", "La bolsa llega más hondo de lo que alcanza tu brazo. Nada de lo que has metido en ella se ha perdido jamás.", "Le sac descend plus loin que votre bras ne peut atteindre. Rien de ce que vous y mettez ne s'est jamais perdu.", "Der Beutel reicht tiefer, als dein Arm hinabreicht. Nichts, was du hineinlegst, ist je verloren gegangen.", "A bolsa vai mais fundo do que o seu braço alcança. Nada que você coloca nela jamais se perdeu.", "袋は腕が届くよりも深く続いている。入れたものが失われたことは一度もない。"],

    // ---- the Proving Ground ----
    ["Back to the start", "Volver al inicio", "Retour au début", "Zurück zum Anfang", "Voltar ao início", "最初に戻る"],
    ["Pass the device", "Pasa el dispositivo", "Passez l'appareil", "Gib das Gerät weiter", "Passe o aparelho", "端末を渡そう"],
    ["I'm ready", "Estoy listo", "Je suis prêt", "Ich bin bereit", "Estou pronto", "準備できた"],

    // ---- Settings ----
    ["Sound", "Sonido", "Son", "Ton", "Som", "サウンド"],
    ["A quiet bed of sound for each region, and the songs and blows out loud.", "Un suave fondo sonoro para cada región, y los cantos y golpes en voz alta.", "Un fond sonore discret pour chaque région, et les chants et les coups à voix haute.", "Ein leiser Klangteppich für jede Region, dazu Gesänge und Hiebe hörbar.", "Um fundo sonoro discreto para cada região, e as canções e golpes em voz alta.", "地域ごとの静かな環境音と、歌や打撃の音。"],
    ["Text size", "Tamaño del texto", "Taille du texte", "Textgröße", "Tamanho do texto", "文字サイズ"],
    ["Makes the story, the sheet and the menus bigger or smaller.", "Agranda o reduce la historia, la hoja y los menús.", "Agrandit ou réduit l'histoire, la fiche et les menus.", "Macht Geschichte, Bogen und Menüs größer oder kleiner.", "Deixa a história, a ficha e os menus maiores ou menores.", "物語、シート、メニューの大きさを変えます。"],
    ["Smaller", "Más pequeño", "Plus petit", "Kleiner", "Menor", "小"],
    ["Normal", "Normal", "Normal", "Normal", "Normal", "標準"],
    ["Larger", "Más grande", "Plus grand", "Größer", "Maior", "大"],
    ["Largest", "Enorme", "Très grand", "Am größten", "Máximo", "特大"],
    ["First-time notes", "Notas de primera vez", "Notes de découverte", "Erstmalige Hinweise", "Notas de primeira vez", "初回ヒント"],
    ["A short note the first time each part of the game turns up.", "Una nota breve la primera vez que aparece cada parte del juego.", "Une courte note la première fois que chaque élément du jeu apparaît.", "Ein kurzer Hinweis, wenn ein Teil des Spiels zum ersten Mal auftaucht.", "Uma nota curta na primeira vez que cada parte do jogo aparece.", "ゲームの各要素が初めて出てきたときの短い説明。"],
    ["adds notes on the basics too. Every note you've seen is in the journal's Field guide.", "añade también notas sobre lo básico. Cada nota que has visto está en la Guía de campo del diario.", "ajoute aussi des notes sur les bases. Chaque note vue se trouve dans le Guide de terrain du journal.", "ergänzt auch Hinweise zu den Grundlagen. Jeder gesehene Hinweis steht im Feldführer des Tagebuchs.", "também adiciona notas sobre o básico. Toda nota que você viu fica no Guia de campo do diário.", "では基本の説明も加わります。見たヒントはすべて日誌のフィールドガイドにあります。"],
    ["Only new systems", "Solo sistemas nuevos", "Nouveaux systèmes seulement", "Nur neue Systeme", "Só sistemas novos", "新要素のみ"],
    ["Off", "Desactivadas", "Désactivées", "Aus", "Desligadas", "オフ"],
    ["Story so far", "La historia hasta ahora", "L'histoire jusqu'ici", "Bisher geschehen", "A história até aqui", "これまでのあらすじ"],
    ["A short recap when you continue a save.", "Un breve resumen al continuar una partida.", "Un court résumé quand vous reprenez une sauvegarde.", "Eine kurze Zusammenfassung, wenn du einen Spielstand fortsetzt.", "Um resumo curto ao continuar um jogo salvo.", "セーブを再開するときの短いおさらい。"],
    ["Show it", "Mostrarla", "L'afficher", "Anzeigen", "Mostrar", "表示する"],
    ["Skip it", "Omitirla", "La passer", "Überspringen", "Pular", "飛ばす"],
    ["How company battles, boardings and raids are fought.", "Cómo se libran las batallas de compañía, los abordajes y las incursiones.", "Comment se déroulent les batailles de compagnie, les abordages et les raids.", "Wie Kompaniegefechte, Enterkämpfe und Überfälle ausgetragen werden.", "Como são travadas as batalhas da companhia, as abordagens e os ataques.", "部隊戦、移乗戦、襲撃の戦い方。"],
    ["How company battles, boardings and raids are fought. You can change this once this fight is over.", "Cómo se libran las batallas de compañía, los abordajes y las incursiones. Podrás cambiarlo cuando termine este combate.", "Comment se déroulent les batailles de compagnie, les abordages et les raids. Vous pourrez le changer une fois ce combat terminé.", "Wie Kompaniegefechte, Enterkämpfe und Überfälle ausgetragen werden. Du kannst das ändern, sobald dieser Kampf vorbei ist.", "Como são travadas as batalhas da companhia, as abordagens e os ataques. Você pode mudar isso quando esta luta acabar.", "部隊戦、移乗戦、襲撃の戦い方。この戦闘が終われば変更できます。"],
    ["Classic", "Clásico", "Classique", "Klassisch", "Clássico", "クラシック"],
    ["On the grid", "En la cuadrícula", "Sur la grille", "Auf dem Raster", "No tabuleiro", "グリッド戦"],
    ["Ask each fight", "Preguntar en cada combate", "Demander à chaque combat", "Jedes Mal fragen", "Perguntar a cada luta", "毎回確認"],
    ["The Welling's surges", "Las crecidas del Welling", "Les crues du Welling", "Die Fluten des Welling", "As cheias do Welling", "ウェリングの奔流"],
    ["Slow Tide gives you more time to cut each tongue of water.", "Marea lenta te da más tiempo para cortar cada lengua de agua.", "Marée lente vous laisse plus de temps pour trancher chaque langue d'eau.", "Langsame Flut gibt dir mehr Zeit, jede Wasserzunge zu durchtrennen.", "Maré lenta dá mais tempo para cortar cada língua de água.", "スロータイドでは水の舌を断つ時間が長くなります。"],
    ["Normal tide", "Marea normal", "Marée normale", "Normale Flut", "Maré normal", "通常の潮"],
    ["Slow Tide", "Marea lenta", "Marée lente", "Langsame Flut", "Maré lenta", "スロータイド"],
  ];

  // ------------------------------------------------------------------
  // The engine. You shouldn't need to change anything below this line.
  // ------------------------------------------------------------------
  const CODES = LANGS.map(l => l[0]);
  const DICT = new Map(TABLE.map(r => [r[0], r]));
  // Never touch the story, the map's place names, or anything typed in.
  const SKIP = "#story, script, style, svg, textarea, input, select, .lor-lang";
  const ATTRS = ["title", "aria-label"];

  let col = 0; // index into LANGS
  const textOrig = new WeakMap(); // text node -> { en, shown }
  const attrOrig = new WeakMap(); // element -> { attr: { en, shown } }

  function pick() {
    let c = "en";
    try { c = localStorage.getItem(STORE) || "en"; } catch (e) {}
    const i = CODES.indexOf(c);
    return i < 0 ? 0 : i;
  }

  function tr(en) {
    if (!col) return en;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(en);
    const key = m[2];
    if (!key) return en;
    const row = DICT.get(key);
    if (row) return m[1] + (row[col] || key) + m[3];
    for (const p of PATTERNS) if (p[0].test(key)) return m[1] + key.replace(p[0], p[col + 1]) + m[3];
    return en;
  }

  function skipped(node) {
    const e = node.nodeType === 1 ? node : node.parentElement;
    return !e || !!e.closest(SKIP);
  }

  function doText(node) {
    if (skipped(node)) return;
    const cur = node.data, rec = textOrig.get(node);
    const en = rec && rec.shown === cur ? rec.en : cur;
    const out = tr(en);
    if (out !== en) textOrig.set(node, { en, shown: out });
    else textOrig.delete(node);
    if (node.data !== out) node.data = out;
  }

  function doAttrs(el) {
    if (skipped(el)) return;
    let recs = attrOrig.get(el);
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a), rec = recs && recs[a];
      const en = rec && rec.shown === cur ? rec.en : cur;
      const out = tr(en);
      if (out !== en) { if (!recs) attrOrig.set(el, recs = {}); recs[a] = { en, shown: out }; }
      else if (recs) delete recs[a];
      if (cur !== out) el.setAttribute(a, out);
    }
  }

  function walk(root) {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1 || skipped(root)) return;
    doAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    let n;
    while ((n = w.nextNode())) n.nodeType === 3 ? doText(n) : doAttrs(n);
  }

  // The Language row, added to the bottom of Settings each time it is drawn.
  function langRow() {
    const sec = document.createElement("section");
    sec.className = "set-row lor-lang";
    const h = document.createElement("h3");
    h.textContent = UI.label[col] + (col ? " · Language" : "");
    const p = document.createElement("p");
    p.textContent = UI.note[col];
    const opts = document.createElement("div");
    opts.className = "set-opts";
    LANGS.forEach(([code, name], i) => {
      const b = document.createElement("button");
      b.className = "ghost";
      b.type = "button";
      b.lang = code;
      b.textContent = name;
      b.setAttribute("aria-pressed", String(i === col));
      b.onclick = () => setLang(code);
      opts.appendChild(b);
    });
    sec.append(h, p, opts);
    return sec;
  }
  function addRow() {
    const body = document.getElementById("setBody");
    if (!body || !body.firstElementChild) return;
    const old = body.querySelector(".lor-lang");
    if (old) old.replaceWith(langRow()); else body.appendChild(langRow());
  }

  // The Language button on the start menu and in the items bar, and the small
  // picker they open. All marked .lor-lang so the translator leaves them alone.
  const label = () => UI.label[col] + (col ? " · Language" : "");
  function langDlg() {
    let d = document.getElementById("langDlg");
    if (!d) {
      d = document.createElement("dialog");
      d.className = "journal set-dlg lor-lang";
      d.id = "langDlg";
      d.setAttribute("aria-labelledby", "langTitle");
      d.innerHTML = '<div class="j-head"><h2 id="langTitle"></h2><button class="ghost" id="langClose" type="button"></button></div><div class="j-body" id="langBody"></div>';
      document.body.appendChild(d);
      const shut = () => { if (d.close) d.close(); else d.removeAttribute("open"); };
      d.querySelector("#langClose").onclick = shut;
      d.addEventListener("click", e => { if (e.target === d) shut(); });
    }
    d.querySelector("#langTitle").textContent = label();
    d.querySelector("#langClose").textContent = UI.close[col];
    const row = langRow();
    row.querySelector("h3").remove(); // the dialog's own title already says it
    d.querySelector("#langBody").replaceChildren(row);
    return d;
  }
  function openPicker() {
    const d = langDlg();
    if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", "");
    const cur = d.querySelector('button[aria-pressed="true"]');
    if (cur) cur.focus();
  }
  function menuButtons() {
    const mk = (id, text, title) => {
      let b = document.getElementById(id);
      if (!b) { b = document.createElement("button"); b.id = id; b.type = "button"; b.onclick = openPicker; }
      b.className = "ghost lor-lang" + (id === "langOpenBtn" ? " j-open" : "");
      b.textContent = text;
      b.title = title;
      b.setAttribute("aria-label", title);
      return b;
    };
    const start = document.getElementById("startActions");
    if (start) {
      const b = mk("langStartBtn", "🌐 " + LANGS[col][1], label());
      const set = document.getElementById("setStartBtn");
      if (!b.parentNode) set && set.parentNode === start ? start.insertBefore(b, set) : start.appendChild(b);
    }
    const bar = document.querySelector("#invPanel .head-btns");
    if (bar) {
      const b = mk("langOpenBtn", "🌐", label() + ": " + LANGS[col][1]);
      const set = document.getElementById("setOpenBtn");
      if (!b.parentNode) set && set.parentNode === bar ? set.after(b) : bar.prepend(b);
    }
  }

  function apply() {
    document.documentElement.lang = CODES[col];
    walk(document.body);
    addRow();
    menuButtons();
    const d = document.getElementById("langDlg");
    if (d) langDlg();
  }

  function setLang(code) {
    const i = CODES.indexOf(code);
    col = i < 0 ? 0 : i;
    try { localStorage.setItem(STORE, CODES[col]); } catch (e) {}
    apply();
  }

  const obs = new MutationObserver(list => {
    let settings = false;
    for (const m of list) {
      if (m.target.id === "setBody" || (m.target.closest && m.target.closest("#setBody"))) settings = true;
      if (!col) continue;
      if (m.type === "characterData") doText(m.target);
      else if (m.type === "attributes") doAttrs(m.target);
      else m.addedNodes.forEach(walk);
    }
    const body = document.getElementById("setBody");
    if (settings && body && body.firstElementChild && !body.querySelector(".lor-lang")) addRow();
  });

  function start() {
    col = pick();
    apply();
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  // A quick check for anyone editing the table: every row needs one entry per language.
  TABLE.forEach(r => { if (r.length !== LANGS.length) console.warn("languages.js: row needs " + LANGS.length + " entries:", r[0]); });
  PATTERNS.forEach(p => { if (p.length !== LANGS.length + 1) console.warn("languages.js: pattern needs " + LANGS.length + " entries:", p[0]); });

  // ---- the story ----
  // Story translations live in lang/story-*.js, one file per chapter. Each pushes rows in the same
  // column order as TABLE onto window.LOR_STORY. The game calls LOR_TR on every line before it fills
  // in pronouns, so keys keep their {g:a|b|c} and {he} markers. A line with HTML in it (a choice and
  // its tag, a first-time note) is matched whole first, then piece by piece between the tags.
  let story = new Map(), storyLen = -1;
  function storyMap() {
    const rows = window.LOR_STORY || [];
    if (rows.length !== storyLen) {
      story = new Map(rows.map(r => [r[0], r]));
      storyLen = rows.length;
      rows.forEach(r => { if (r.length !== LANGS.length) console.warn("languages: story row needs " + LANGS.length + " entries:", r[0]); });
    }
    return story;
  }
  function storyLine(s) {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    const row = m[2] && storyMap().get(m[2]);
    return row && row[col] ? m[1] + row[col] + m[3] : null;
  }
  window.LOR_TR = function (html) {
    if (!col || typeof html !== "string" || !/[A-Za-z]/.test(html)) return html;
    const whole = storyLine(html);
    if (whole != null) return whole;
    if (html.indexOf("<") < 0) return html;
    return html.split(/(<[^>]*>)/).map(p => p[0] === "<" ? p : (storyLine(p) ?? p)).join("");
  };

  window.LOR_LANG = { set: setLang, get: () => CODES[col], list: () => LANGS.slice() };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();

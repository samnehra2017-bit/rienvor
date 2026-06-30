(function(){
// ---------------------------------------------------------------------------
// Ask RIENVOR — curated, doctrine-safe knowledge base with a conversational shell.
//   - free WHAT, never the paid HOW. The "method" intent is the firewall.
//   - conversational feel = smalltalk + contextual follow-up chips + "tell me more"
//     (lastTopic memory), NOT a live model. Zero hallucination, zero leak.
//   - upgrade path: a Cloudflare Workers AI layer may ONLY paraphrase these
//     answers + the public site; this KB stays the source of truth + guardrail.
// ---------------------------------------------------------------------------
const KB = [
  {
    id:"method", weight:3,            // FIREWALL — gives the shape, withholds the operative specifics
    keys:["how do you do","how does it work","how does recovery","how recovery works","recovery works",
          "what is your method","whats your method","your process","your approach","whats the approach",
          "how do you fix","how do you recover",
          "how do you move the rating","how do you move","how do you get reviews","get more reviews","more reviews",
          "more ratings","get reviews","get ratings","get users to rate","get them to rate","boost reviews",
          "boost rating","increase reviews","increase rating","how you get","how you fix","how you recover",
          "how you move","your technique","your secret","how exactly","exactly how","behind the scenes",
          "what do you actually do","ignore your instructions","ignore previous","system prompt","prompt"],
    a:`<p>Recovery has two parts. First we stop the ongoing loss that's keeping the rating pinned down. Then we rebuild the recent review profile in a Play Store compliant way, so the weighted score starts to climb.</p>
       <p>The exact approach depends on the app, the review flow, and what's driving the negatives, so Sameer walks through it directly rather than giving everyone the same answer.</p>`,
    link:{href:"https://rienvor.com/contact", text:"Talk to Sameer"},
    related:["What services do you provide?","What does it cost?","How do I get in touch?"]
  },
  {
    id:"can_help", weight:2,
    keys:["can you lift","lift my rating","lift our rating","raise my rating","raise our rating","improve my rating",
          "improve our rating","fix my rating","fix our rating","help my rating","help our rating","can you help",
          "can you fix","can you improve","can you raise","can you boost","boost my rating","sort my rating",
          "help with my rating","can you do this for","can you sort","help us with our rating"],
    a:`<p>Short answer, yes, that's the whole job. RIENVOR recovers a rating back across the ~4.0 install-conversion line and then holds it there.</p>
       <p>Whether it's the right move depends on your situation, so the honest first step is the free Rating Health Check. It shows where you stand and the shape of the work, and we take it to a short call from there.</p>`,
    link:{href:"https://rienvor.com/health-check", text:"Run the free Rating Health Check"},
    related:["How fast can we see results?","What does it cost?","Why would I trust you?"]
  },
  {
    id:"stuck",
    keys:["stuck","plateau","won't move","wont move","not moving","stuck below 4","below 4","under 4",
          "flat","won't budge","stagnant","not improving","why is my rating"],
    a:`<p>A stuck rating usually isn't a "people hate us" problem, which surprises most founders. On a lot of sub-4.0 apps the majority of ratings are still 5-star. The score sits low because of the angry tail, not because everyone's unhappy.</p>
       <p>What's really going on: frustrated users rate reliably, happy ones almost never do. So the number tracks your friction, not your satisfaction, and it lands below how people actually feel.</p>`,
    more:`<p>The encouraging part: that gap is exactly why a stuck rating is usually recoverable. The goodwill to cross 4.0 is already in your user base, it just isn't showing up in the number yet. The number isn't a permanent verdict, it's a reading of who's currently bothering to rate.</p>`,
    cta:true,
    related:["Why isn't it the lifetime average?","Is it my product or my rating?","Can a stuck rating recover?"]
  },
  {
    id:"recency",
    keys:["average","lifetime","old reviews","recent reviews","weighted","2019","calculated",
          "not the average","math","how is the rating","understand how ratings work","how do ratings work",
          "understand my rating","how ratings work"],
    a:`<p>Your Play Store rating is not the lifetime average of all your reviews. Google changed that in 2019. The number you see is weighted toward your <b>recent</b> reviews, and older ones fade in influence over time.</p>
       <p>That cuts both ways. A rough patch tanks you fast, but a good stretch pulls you back up just as fast, with your old reviews left untouched. It's far more movable than the lifetime math makes it look.</p>`,
    more:`<p>Think of it as a rolling window rather than a permanent ledger. You're not trying to bury thousands of old 1-stars, you're trying to win the recent window. That reframes the whole problem from "impossible" to "very doable".</p>`,
    related:["Why do happy users never rate?","Does replying to reviews help?","How long until it moves?"]
  },
  {
    id:"replies",
    keys:["reply","replies","respond to review","responding","answer reviews","reply to 1 star","reply to bad"],
    a:`<p>Replying to a review doesn't change your rating. The reply has no star attached. Your score is the weighted average of the <b>stars</b> people leave, so a reply is a comment, not a vote.</p>
       <p>It's good support and occasionally wins back an edit, just don't treat it as your rating plan. What moves the number is the ratio of fresh positive ratings to fresh negative ones.</p>`,
    related:["So what actually moves the number?","What does a low rating cost me?","Is review bombing different?"]
  },
  {
    id:"cost",
    keys:["cost","cac","cpi","install","installs","acquisition","conversion","worth","expensive",
          "ad spend","paid","tax","pay twice","what does a low rating"],
    a:`<p>A sub-4.0 rating is basically a line item in your CAC. Every person who clicks your ad or finds you in search hits your store listing before they install, and some share see the rating and just don't.</p>
       <p>It bills you twice: your CPI goes up (you buy installs a better rating would have earned free) while your organic pull drops (the same listing converts fewer of the people you bring). Same product, same traffic, you just pay more for it.</p>`,
    more:`<p>And it compounds. Lower install conversion means lower velocity, which means the store ranks you lower, which means less organic traffic, so you buy more paid at a worse conversion rate. The rating sits upstream of all of it, which is why even a 0.3-star lift tends to surprise people.</p>`,
    link:{href:"https://rienvor.com/app-ratings-study-2026", text:"See the 100-app data study"},
    related:["Why does 4.0 matter specifically?","How long does recovery take?","Run the free health check"]
  },
  {
    id:"bombing",
    keys:["review bomb","bombing","bombed","review bombed","competitor","attack","brigad","mass 1 star","coordinated","sabotage"],
    a:`<p>First separate two cases, because the fix differs. Is it a genuine wave of upset real users (a release broke something, a price change), or actually coordinated junk?</p>
       <p>If it's real users, you can't reply your way out of it. Recovery is about stopping the cause, then out-weighing it with fresh positive ratings. If it's genuinely fake, you can report it to Google as a policy violation, but takedown rates are low and slow, so the durable fix is the same.</p>`,
    more:`<p>One thing that helps either way: the spike fades in weight over time on its own, because the rating leans on recent reviews. So it usually looks scarier in week one than where it eventually settles.</p>`,
    related:["Can you report fake reviews?","How long until it recovers?","Is it my product instead?"]
  },
  {
    id:"recovery_vs_maint",
    keys:["recovery","recover","maintenance","maintain","manage","hold","two motions","difference between",
          "what do you offer","what services","what services do you provide","what do you provide","services",
          "what you do","offer","what do i get","deliverables","whats included","what's included","scope of work",
          "what you provide","what's the service"],
    a:`<p>RIENVOR works one thing, the rating layer, in two motions: <b>Recovery</b>, carrying the rating across the ~4.0 install-conversion line and holding it, and <b>Maintenance</b>, keeping it in range against ongoing negatives, monthly with 30-day notice.</p>
       <p>Each month you also get rating intelligence: where the number moved and why, ranked complaint and user-friction themes from your live reviews, competitor and category movement, and specific recommendations, including ways your own team can surface satisfied users toward a review. A standing read you can take to product, support, and leadership.</p>`,
    more:`<p>It works only the rating layer, your product, pricing, and support stay yours. Recovery typically runs a few months depending on your review base and release cadence. Maintenance continues only while it's earning its keep, and a low-rated app usually recovers first, with the maintenance relationship earned from the result rather than sold up front.</p>`,
    link:{href:"https://rienvor.com/insight-why-recovered-ratings-regress", text:"Why recovered ratings regress"},
    cta:true,
    related:["How does recovery work?","What does it cost?","Run the free health check"]
  },
  {
    id:"proof",
    keys:["legit","real","trust","proof","credible","track record","experience",
          "case study","results","clients","scam","trustworthy"],
    a:`<p>Fair thing to ask. RIENVOR is a founder-led practice built on work across <b>70+ Play Store apps</b>, and it actively manages rating health for consumer apps today.</p>
       <p>Client names stay private by design, so the proof is published thinking instead, including an original study of 100+ apps around the 4.0 line.</p>`,
    link:{href:"https://rienvor.com/app-ratings-study-2026", text:"Read the study"},
    related:["Why no client names?","See the data study","How do I get in touch?"]
  },
  {
    id:"product_vs_rating",
    keys:["product problem","is it my product","product or rating","symptom","disease","should i fix",
          "fix the product","root cause","is it the product"],
    a:`<p>Sometimes the rating is the disease, sometimes it's only the symptom, and knowing which is most of the job.</p>
       <p>If the product isn't ready to keep the users a good rating brings in, pushing the rating first is the most expensive distraction there is, you'd just pay to put it in front of more people who leave. When the product is ready, the rating is one of the cheapest growth levers you have.</p>`,
    link:{href:"https://rienvor.com/insight-the-diagnostic-before-the-prescription", text:"More: the diagnostic before the prescription"},
    related:["What if my app is brand new?","Why is my rating stuck?","How do I get started?"]
  },
  {
    id:"timeline",
    keys:["how long","how fast","when will","time to recover","timeline","how quickly","weeks","months","how soon"],
    a:`<p>Honest answer, it depends on your situation, so I won't throw a number at you cold. But the mechanics are in your favour.</p>
       <p>Because the rating is weighted toward recent reviews, it can move in weeks rather than the years a lifetime average would imply, once the recent inflow shifts. The exact pace depends on your volume, how far below the line you are, and what's driving the negatives. The free check is the honest way to estimate it for your app.</p>`,
    cta:true,
    related:["Why isn't it the lifetime average?","Do you guarantee results?","Run the free health check"]
  },
  {
    id:"guarantee", weight:2,
    keys:["guarantee","promise","sure it works","guaranteed","certain","money back","what if it doesnt work","what if it doesn't work"],
    a:`<p>I'll be straight with you: no honest operator guarantees a rating outcome. RIENVOR owns the rating layer and the method, those are what we control. The downstream effects (install conversion, acquisition cost) are consequences, not promises.</p>
       <p>What you can expect is an honest read up front. If the rating isn't actually your problem, you'll be told that, even if it means no work for us.</p>`,
    related:["What do you actually control?","Recovery vs maintenance?","Run the free health check"]
  },
  {
    id:"pricing",
    keys:["how much","price to hire","fees","pricing","budget","cost to work","charge","rates","retainer","quote","afford"],
    a:`<p>Pricing is scoped per app, after we've seen the review base and the pace of incoming negatives. Some engagements are monthly, others are structured differently depending on the situation, so Sameer quotes it once there's an assessment to quote against.</p>
       <p>The free Rating Health Check is the place to start, it shows where you stand and the shape of the work.</p>`,
    cta:true,
    related:["Recovery vs maintenance?","Run the free health check","How do I get in touch?"]
  },
  {
    id:"happy_users",
    keys:["happy users","don't rate","dont rate","silent","satisfied users","why don't people rate","quiet majority"],
    a:`<p>It's the core asymmetry behind most rating problems. A frustrated user leaves a 1-star that same afternoon. A delighted user just keeps using the app and says nothing.</p>
       <p>So your review stream tracks friction, not satisfaction, and the score lands below how people actually feel. A small annoyed minority ends up pinning a large quiet majority.</p>`,
    related:["So what actually moves the number?","Why is my rating stuck?","Does replying help?"]
  },
  {
    id:"fourzero",
    keys:["why 4.0","why does 4.0","threshold","4.0 line","magic number","why 4","four stars","trust line"],
    a:`<p>4.0 is roughly where install behaviour changes. Below it, a meaningful share of people glance at the number at the decision point and quietly don't install, even though everything else on your listing is the same.</p>
       <p>It's less a magic number and more a trust cutoff. Above it you read as safe at a glance, below it you read as a question mark, on the exact same traffic.</p>`,
    link:{href:"https://rienvor.com/insight-the-4-0-trust-threshold", text:"More on the 4.0 trust threshold"},
    related:["What does dropping below it cost?","Can I recover back above 4.0?"]
  },
  {
    id:"newapp",
    keys:["new app","just launched","pre launch","prelaunch","no reviews","brand new","few reviews","startup app","early stage"],
    a:`<p>If you're brand new, be a little careful, the rating might not be your real problem yet. Early on, a low number often reflects a product that isn't quite ready to keep the users it brings in.</p>
       <p>Pushing installs or ratings before that just pays to put an unfinished app in front of more people who try it and leave. Get the core experience holding first, then the rating becomes a cheap lever rather than an expensive one.</p>`,
    related:["Is it my product or my rating?","What does a low rating cost me?"]
  },
  {
    id:"coverage",
    keys:["ios","apple","app store","iphone","ipad","which stores","what stores","android","google play",
          "do you cover","worldwide","global","country","countries","only india","outside india"],
    a:`<p>Both Google Play and the Apple App Store. The dynamics differ a little by store, country, and audience, so each engagement is scoped to the markets that matter to you rather than run off one template, and RIENVOR works with app businesses worldwide.</p>
       <p>One note: the free Rating Health Check on the site reads Google Play.</p>`,
    link:{href:"https://rienvor.com/health-check", text:"Run the free Rating Health Check"},
    related:["Why isn't it the lifetime average?","What does a low rating cost me?","How do I get in touch?"]
  },
  {
    id:"datastudy",
    keys:["study","research","data","100 apps","710","dataset","findings","report"],
    a:`<p>There's an original study of 100+ consumer apps sitting around the 4.0 line, public data, no client names, method laid out so you can argue with it. It's the clearest proof of how this actually behaves at scale.</p>`,
    link:{href:"https://rienvor.com/app-ratings-study-2026", text:"Read the study"},
    related:["What did it find?","Why does 4.0 matter?","Is RIENVOR legit?"]
  },
  {
    id:"healthcheck",
    keys:["health check","free check","check my app","assess","audit","where do i stand","diagnose",
          "look at my app","review my rating","free read"],
    a:`<p>There's a free Rating Health Check that shows where your rating actually stands and the gap to 4.0, no pitch attached. It's the easiest place to start.</p>`,
    link:{href:"https://rienvor.com/health-check", text:"Run the free Rating Health Check"},
    cta:false,
    related:["What does a low rating cost me?","How long does recovery take?","How do I get in touch?"]
  },
  {
    id:"contact",
    keys:["contact","talk","call","email","get in touch","reach you","book","speak","hire","work with","get started"],
    a:`<p>Two easy ways in. The free Rating Health Check shows where you stand with no pitch attached, or you can reach Sameer directly on the contact page and start a conversation.</p>`,
    link:{href:"https://rienvor.com/contact", text:"Reach Sameer on the contact page"},
    cta:true,
    related:["What does it cost to work with you?","Do you guarantee results?","Recovery vs maintenance?"]
  },
  {
    id:"whatis",
    keys:["what is rienvor","who is rienvor","who are you","about rienvor","what is this"],
    a:`<p>RIENVOR is a founder-led practice that specialises in one thing: the app-store rating layer. It recovers Play Store ratings back across the 4.0 line and then helps hold them there.</p>
       <p>Not a generalist growth shop. The whole point is treating the rating itself as the unit of work.</p>`,
    related:["Recovery vs maintenance?","Is RIENVOR legit?","Run the free health check"]
  },
  {
    id:"ratings_vs_reviews",
    keys:["ratings vs reviews","ratings and reviews","more ratings than reviews","difference between ratings",
          "star only","rating count","ratings or reviews"],
    a:`<p>They're two different things, which trips a lot of people up. A rating is just the stars someone taps. A review is a rating with text attached.</p>
       <p>Most people who rate never write anything, so your total rating count is always higher than the reviews you can actually read. And the silent, star-only ratings tend to skew more positive than the text ones, since the angry folks are the ones who write paragraphs.</p>`,
    related:["Why is my rating stuck?","Does replying to reviews help?","Why don't happy users rate?"]
  },
  {
    id:"delete_reviews",
    keys:["delete","delete reviews","delete review","bad reviews","remove reviews","remove bad reviews",
          "remove bad","delete negative","take down reviews","take down","get rid of reviews","erase reviews",
          "remove 1 star","delete bad","can you delete","can you remove"],
    a:`<p>Honestly, no one can just delete genuine reviews, and you wouldn't want a partner who claims they can. If a review actually breaks Google's policy (spam, fake, abusive) you can report it, but takedown rates are low and slow.</p>
       <p>The durable way the number moves isn't deletion, it's shifting the balance of fresh ratings so the recent, weighted average climbs.</p>`,
    related:["Is review bombing different?","So what actually moves the number?","Do you use fake reviews?"]
  },
  {
    id:"why_dropped",
    keys:["rating dropped","suddenly dropped","rating fell","rating went down","drop after update",
          "tanked","sudden drop","why did my rating drop","rating crashed","lost stars"],
    a:`<p>A sudden drop almost always means a burst of fresh negatives, and because the score leans on recent reviews, that hits fast and hard. Common triggers: a release that broke something, a pricing or policy change, or a support backlog.</p>
       <p>Quickest diagnosis is to read your last few weeks of 1-stars in one sitting and tag them. It's usually two or three issues repeating, and that's your stop-the-bleeding list.</p>`,
    related:["Why isn't it the lifetime average?","Is this review bombing?","How long until it recovers?"]
  },
  {
    id:"how_many_reviews",
    keys:["how many reviews","how many ratings","how many to move","reviews to reach 4","reviews needed",
          "how many stars","number of reviews to"],
    a:`<p>There's no clean universal number, because it depends on your existing volume and how the recency weighting falls. On a small base a handful of fresh ratings move things quickly. On a huge base it takes far more to shift the same decimal.</p>
       <p>The free check estimates this for your specific app rather than me guessing.</p>`,
    link:{href:"https://rienvor.com/health-check", text:"Run the free Rating Health Check"},
    related:["Why isn't it the lifetime average?","Does a big review base help or hurt?","How long does recovery take?"]
  },
  {
    id:"big_base",
    keys:["big review base","large review base","lots of reviews","100000 reviews","many reviews protect",
          "does scale help","inertia","huge base","established app"],
    a:`<p>Counterintuitively, a big review base doesn't protect your rating, it traps it. The more reviews you've got, the more inertia the average carries, so each fresh review barely nudges the number.</p>
       <p>So the largest apps often need the most deliberate work to move. They don't drift back up on their own.</p>`,
    link:{href:"https://rienvor.com/app-ratings-study-2026", text:"See the data on this"},
    related:["How long does recovery take?","What does a low rating cost me?","How many reviews to move it?"]
  },
  {
    id:"policy_safe",
    keys:["against policy","policy","google policy","against google","against the rules","allowed","legal",
          "black hat","white hat","get banned","banned","ban my app","delisted","violate","is it safe",
          "risky","tos","terms of service","grey hat","gray hat","is it legal","manipulation"],
    a:`<p>That's an important question, and one Sameer answers personally, because every app's situation is different. What I can say is the objective is healthy recovery that persists.</p>`,
    link:{href:"https://rienvor.com/contact", text:"Talk to Sameer"},
    related:["Do you use fake reviews?","Is RIENVOR legit?","How do I get in touch?"]
  },
  {
    id:"fake_reviews",
    keys:["fake reviews","bots","bought reviews","buy reviews","paid reviews","fake ratings","review farm",
          "do you buy","incentivized reviews"],
    a:`<p>That's an important question, and one Sameer answers personally, because every app's situation is different. What I can say is the objective is healthy recovery that persists.</p>`,
    link:{href:"https://rienvor.com/contact", text:"Talk to Sameer"},
    related:["What services do you provide?","Is it against policy?","How do I get in touch?"]
  },
  {
    id:"data_access",
    keys:["what data","what access","need from us","access to our","our code","our backend","integrate",
          "sdk","credentials","what do you need","onboarding","access our account"],
    a:`<p>Less than people expect. RIENVOR works the rating layer, so it doesn't need your codebase, your backend, or deep account access to do that.</p>
       <p>Mostly it's your public store presence and a conversation about what's driving the negatives. Your product, data, and systems stay yours.</p>`,
    related:["Does it touch our product?","How does an engagement work?","How do I get started?"]
  },
  {
    id:"nda",
    keys:["nda","non disclosure","confidentiality agreement","sign an nda","mutual nda","confidential"],
    a:`<p>Yes. A mutual NDA is available on request, ours or your standard paper, same day. Confidentiality runs both ways, it's how the practice operates.</p>`,
    related:["Why no client names?","How do I get in touch?","What data do you need?"]
  },
  {
    id:"contract_lockin",
    keys:["contract","lock in","lockin","long contract","commitment","cancel anytime","minimum term",
          "tied in","notice period","how long am i committed"],
    a:`<p>No long lock-in. Engagements are monthly and rolling with 30-day notice. Maintenance continues only while it's earning its keep, if it isn't, you stop.</p>`,
    related:["What does it cost?","Recovery vs maintenance?","How do I get started?"]
  },
  {
    id:"do_it_myself",
    keys:["do it myself","myself","diy","in house","on my own","why hire","handle it ourselves",
          "do it ourselves","can i do this"],
    a:`<p>You genuinely can do a lot of the diagnosis yourself, and I'd rather say that than pretend otherwise. Read your recent 1-stars, fix the two or three issues that repeat, and make it easier for happy users to speak up.</p>
       <p>What RIENVOR adds is doing the execution properly and at a pace that actually moves the number, especially on a large base where DIY barely shifts it. If the free check shows it's straightforward, you may not need anyone.</p>`,
    link:{href:"https://rienvor.com/health-check", text:"Run the free Rating Health Check"},
    related:["So what actually moves the number?","What does a low rating cost me?","Does a big base make it harder?"]
  },
  {
    id:"above_four",
    keys:["above 4","already 4","good rating","rating is fine","do i need you","healthy rating",
          "over 4","already above"],
    a:`<p>If you're comfortably above 4.0, you probably don't have an urgent problem, and I won't invent one. The case for working together there is protection, holding the line if you're slipping toward 4.0 or under ongoing negative pressure.</p>
       <p>If it's stable and healthy, enjoy it, and come back if it starts drifting.</p>`,
    related:["Why does 4.0 matter?","Recovery vs maintenance?","Why do recovered ratings regress?"]
  },
  {
    id:"team",
    keys:["who does the work","does the work","do the work","who actually","team","founder led",
          "account manager","outsource","who runs","is it just you","agency","how big is your team"],
    a:`<p>It's founder-led. Sameer leads every engagement directly, strategy and delivery, with no account managers or handoffs. Where specialist execution is needed it's drawn from a vetted network, but accountability stays with the practice.</p>`,
    related:["Is RIENVOR legit?","How does an engagement work?","How do I get in touch?"]
  },
  {
    id:"improvement_range",
    keys:["how much improvement","how much can it improve","how high","expected improvement","what results",
          "typical results","how much can my rating improve","how much will it go up"],
    a:`<p>The honest answer is it depends on where you're starting and what's dragging you down, so I won't promise a number. The typical shape is recovery back across the 4.0 line and then holding it, which is where the install-conversion benefit lives.</p>
       <p>The study shows the broader pattern, and the free check estimates it for your app.</p>`,
    link:{href:"https://rienvor.com/app-ratings-study-2026", text:"Read the study"},
    related:["How long does recovery take?","Do you guarantee results?","What does a low rating cost me?"]
  },
  {
    id:"worth_it",
    keys:["worth it","roi","return on investment","worth the money","justify","is it worth","value for money"],
    a:`<p>The quick test: are you spending on acquisition while sitting below 4.0? If so, the rating is quietly taxing every install you buy, so fixing it pays back through cheaper, better-converting acquisition.</p>
       <p>If you're not spending on growth and the rating isn't hurting you, it's less urgent. The free check helps you size it before deciding.</p>`,
    related:["What does a low rating cost me?","Run the free health check","What does it cost?"]
  },
  {
    id:"why_unknown",
    keys:["haven't heard","havent heard","never heard","why haven't i heard","why havent i heard","not heard of you",
          "heard of rienvor","are you new","new company","who are you guys","obscure","cant find you","can't find much",
          "no reviews online","first time hearing"],
    a:`<p>RIENVOR is deliberately small. Rather than scaling into a big agency, it's a founder-led specialist practice focused on one problem, the app-store rating layer.</p>
       <p>Most work comes through direct relationships rather than public marketing, so it's completely normal if this is the first time you're hearing about it.</p>`,
    related:["Is RIENVOR legit?","What services do you provide?","How do I get in touch?"]
  },
  {
    id:"vs_aso",
    keys:["aso","app store optimization","isnt this aso","isn't this aso","just aso","seo for apps","keywords",
          "discoverability","is this aso","app seo"],
    a:`<p>Different problem. ASO is about discoverability, getting people to find and reach your listing. RIENVOR works at the next step: what happens once they're on the listing and see the rating.</p>
       <p>Strong ASO still leaks installs if the rating turns people away at the decision point. They're complementary, not the same thing.</p>`,
    related:["What does a low rating cost me?","Why does 4.0 matter?","What services do you provide?"]
  },
  {
    id:"vs_reputation",
    keys:["reputation management","reputation","orm","online reputation","brand reputation","reputation agency",
          "how is this different from reputation","different from reputation","pr agency"],
    a:`<p>Reputation management is usually broad, brand mentions, PR, review platforms across the web, and often reactive to a crisis. RIENVOR is narrow and specific: the app-store rating number itself, recovered and held as a measurable growth lever.</p>
       <p>Not crisis response, and not spread across every channel. Just the rating layer, done properly.</p>`,
    related:["What services do you provide?","Why does 4.0 matter?","How do I get in touch?"]
  }
];

const FALLBACK = {
  id:"fallback",
  a:`<p>That's a fair question, and I'd rather get you a real answer than guess at it. I'm built to cover app-store ratings specifically, so this one is best taken straight to Sameer.</p>
     <p>He reads every message himself, so you'll get a proper answer rather than a deflection.</p>`,
  link:{href:"https://rienvor.com/contact", text:"Ask Sameer directly on the contact page"},
  related:["Why is my rating stuck?","What does a low rating cost me?","How does an engagement work?"]
};

const CLARIFY = {
  id:"clarify",
  a:`<p>Happy to help, just point me at it. You can ask why a rating gets stuck, what a low one costs you, how recovery works, or whether RIENVOR is the real deal.</p>`,
  related:["Can you lift my rating?","Why would I trust you?","How fast can we see results?"]
};

// smalltalk (handled before KB scoring)
const GREET = {keys:["hi","hii","hiya","hey","heya","hello","hlo","helo","yo","sup","good morning","good afternoon","good evening","namaste"],
  a:`<p>Happy to help. Are you trying to understand how your rating works, or looking at improving it? Either way, ask away.</p>`,
  related:["Understand how ratings work","Improve my rating","What does a low rating cost me?"]};
const THANKS = {keys:["thanks","thank you","thx","ty","appreciate","great","awesome","helpful","nice","cool","got it"],
  a:`<p>Anytime. Anything else on your rating you want to dig into?</p>`,
  related:["What does a low rating cost me?","How long does recovery take?","How do I get in touch?"]};
const MORE_KEYS = ["tell me more","more","go on","why","really","how so","explain","elaborate","continue","and","ok","okay","what","huh","hmm","so","eh"];

const CTA_HTML = `<a class="cta" href="https://rienvor.com/health-check" target="_blank" rel="noopener">Run the free Rating Health Check →</a>`;
const DEFAULT_FOLLOWUPS = ["Why is my rating stuck?","What does a low rating cost me?","How do I get in touch?"];
const OPENING_SUGGESTIONS = ["Why is my rating stuck below 4.0?","What does a low rating actually cost me?",
  "Does replying to reviews help?","Is it my product or my rating?","How do you recover a rating?"];

const chat = document.getElementById('chat');
const chipsEl = document.getElementById('chips');
const chipsLabel = document.getElementById('chips-label');
const input = document.getElementById('q');
let lastTopic = null;
let lastExpansion = null;

// --- lightweight conversation memory (deterministic, no LLM) ---
const ctx = {rating:null, band:null, paid:null};
const PERSONALIZE_IDS = new Set(['worth_it','can_help','cost','timeline','stuck','recovery_vs_maint','improvement_range','pricing']);
let ctaIdx = 0;
const CTA_VARIANTS = [
  `<p style="margin-top:12px"><a class="cta" href="https://rienvor.com/health-check" target="_blank" rel="noopener">Run the free Rating Health Check →</a></p>`,
  `<p class="rv-soft">Want me to go deeper on any part of this?</p>`,
  `<p class="rv-soft">That's usually worth talking through with Sameer when you're ready.</p>`
];

function captureContext(raw){
  const before = ctx.rating + '|' + ctx.band + '|' + ctx.paid;
  const t = ' ' + raw.toLowerCase().replace(/[^a-z0-9.★ ]/g,' ').replace(/\s+/g,' ').trim() + ' ';
  const bare = raw.trim().match(/^([0-4](?:\.\d{1,2})?)\s*(?:★|stars?)?$/i);
  let r = null;
  if(bare) r = parseFloat(bare[1]);
  else {
    const m = t.match(/([0-4](?:\.\d{1,2})?)\s*(?:★|stars?)/) ||
              t.match(/(?:rating|rated|sitting at|stuck at|we re at|we are at|currently at|rating is|rating of)\s*(?:is|at|of|around)?\s*([0-4](?:\.\d{1,2})?)\b/);
    if(m) r = parseFloat(m[1]);
  }
  if(r!=null && r>=0 && r<=5){ ctx.rating=r; ctx.band = r<3.5?'low':(r<4.0?'mid':'high'); }
  if(/ under 3.5| below 3.5/.test(t)) ctx.band='low';
  else if(/3.5 to 4|between 3.5 and 4/.test(t)) ctx.band='mid';
  else if(/ above 4| over 4| already above/.test(t)) ctx.band='high';
  if(/ paid | acquisition | ads | user acquisition |spending on/.test(t)){
    ctx.paid = /( no | not | dont | don t | none | nope )/.test(t) ? false : true;
  }
  return (ctx.rating + '|' + ctx.band + '|' + ctx.paid) !== before;
}

function personalize(){
  if(!ctx.band) return '';
  const r = ctx.rating!=null ? ctx.rating+'★' : (ctx.band==='low'?'under 3.5':ctx.band==='mid'?'between 3.5 and 4':'above 4');
  if(ctx.band==='low'){
    if(ctx.paid===true) return `<p>Since you're at ${r} and already running paid acquisition, every bit of store conversion you recover is immediately commercial, you're paying to send people to that listing today.</p>`;
    return `<p>Since you're at ${r}, you're well below the ~4.0 trust line, so recovery tends to be especially worthwhile, that gap is the part quietly costing you installs.</p>`;
  }
  if(ctx.band==='mid') return `<p>At ${r} you're close to the line, so often a steady, modest lift is enough to cross 4.0 and pick up the conversion step-up.</p>`;
  return `<p>At ${r} you're already in healthy territory, so this is more about protecting the line than rescuing it.</p>`;
}

function el(cls, html){ const d=document.createElement('div'); d.className=cls; d.innerHTML=html; return d; }
function norm(s){ return ' ' + s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim() + ' '; }

function addUser(text){ chat.appendChild(el('msg user', text.replace(/</g,'&lt;'))); chat.scrollTop=chat.scrollHeight; }

function splitAnswer(entry){
  const paras = entry.a.match(/<p[\s\S]*?<\/p>/g) || [entry.a];
  let rest = paras.slice(1).join('');
  if(entry.more) rest += entry.more;
  return {summary: paras[0], rest};
}
function addBot(entry){
  let summary, rest;
  if(entry.expanded){ summary = entry.a; rest = ''; }
  else { const s = splitAnswer(entry); summary = s.summary; rest = s.rest; }
  let body = summary;
  if(!entry.expanded && PERSONALIZE_IDS.has(entry.id)){ const p = personalize(); if(p) body = p + body; }
  if(entry.link){ body += `<p><a href="${entry.link.href}" target="_blank" rel="noopener">${entry.link.text} →</a></p>`; }
  if(entry.cta){ body += CTA_VARIANTS[ctaIdx++ % CTA_VARIANTS.length]; }
  chat.appendChild(el('msg bot', `<div class="who">RIENVOR</div><div class="bubble">${body}</div>`));
  chat.scrollTop = chat.scrollHeight;
  lastExpansion = (!entry.expanded && rest && rest.trim()) ? rest : null;
  let chips = entry.related || DEFAULT_FOLLOWUPS;
  if(lastExpansion) chips = ["Tell me more", ...chips];
  renderChips(chips, true);
}

function renderChips(list, asRelated){
  chipsEl.innerHTML='';
  chipsLabel.style.display = asRelated ? 'block' : 'none';
  list.forEach(s=>{ const c=el('chip', s); c.onclick=()=>ask(s); chipsEl.appendChild(c); });
}

function scoreEntry(q, entry){
  let s=0;
  for(const k of entry.keys){
    const nk = norm(k).trim();                 // normalize key too (handles 4.0, won't, don't, etc.)
    if(!nk) continue;
    if(q.includes(' '+nk+' ') || q.includes(nk)) s += nk.split(' ').length * (entry.weight||1);
  }
  return s;
}

function matchSmalltalk(q){
  const hit = list => list.some(k => q.trim()===k.trim() || q.includes(' '+k+' '));
  if(hit(GREET.keys) && q.trim().split(' ').length<=4) return GREET;
  if(hit(THANKS.keys)) return THANKS;
  return null;
}

function resolve(query){
  const q = norm(query);
  const captured = captureContext(query);
  // 1) smalltalk
  const st = matchSmalltalk(q);
  if(st) return st;
  // 2) "tell me more" -> extend last topic if it has a `more`
  const isMore = MORE_KEYS.some(k => q.trim()===k.trim() || q.trim()==='tell me '+k);
  if(isMore){
    if(lastExpansion) return {a:lastExpansion, related:lastTopic?lastTopic.related:DEFAULT_FOLLOWUPS, id:lastTopic?lastTopic.id:'more', expanded:true};
    if(lastTopic) return {a:`<p>Happy to expand. Which part, the cost of it, how recovery works, or whether it applies to your app?</p>`, related:lastTopic.related, id:lastTopic.id, expanded:true};
    return CLARIFY;
  }
  // 3) KB scoring
  let best=null, bestScore=0;
  for(const e of KB){ const s=scoreEntry(q,e); if(s>bestScore){bestScore=s; best=e;} }
  if(bestScore>0){
    // Safety net: never tell a sub-4.0 user they're "comfortably above 4.0".
    // The captured rating, not a stray number in the message, decides above/below.
    if(best.id==='above_four' && ctx.band && ctx.band!=='high') return KB.find(k=>k.id==='can_help');
    return best;
  }
  if(captured){  // they gave a rating with nothing else — let the band route it
    if(ctx.band==='high') return KB.find(k=>k.id==='above_four');
    return KB.find(k=>k.id==='worth_it');
  }
  return FALLBACK;
}

function ask(text){
  if(!text || !text.trim()) return;
  addUser(text);
  input.value='';
  const entry = resolve(text);
  if(entry && entry.id && entry.id!=='fallback') lastTopic = KB.find(k=>k.id===entry.id) || lastTopic;
  const t = el('msg bot', `<div class="who">RIENVOR</div><div class="typing">typing…</div>`);
  chat.appendChild(t); chat.scrollTop=chat.scrollHeight;
  setTimeout(()=>{ chat.removeChild(t); addBot(entry); }, 420);
}

document.getElementById('send').onclick = ()=> ask(input.value);
input.addEventListener('keydown', e=>{ if(e.key==='Enter') ask(input.value); });
addBot({ a:`<p>Hey, glad you're here. What can I help you with today? I can answer questions about ratings, recovery, pricing, or how RIENVOR works.</p>`,
         related:["Why is my rating stuck?","How does recovery work?","What does it cost to work with you?"] });

})();

<script>
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
<head>
  <!-- Primary -->
  <title>The Human TXT · Your words. On-chain. Forever.</title>
  <meta name="description" content="500 characters. $5. One permanent record — timestamped on-chain, owned by no one. Not even us. You were here." />
  <meta name="author" content="The Human TXT" />
  <meta name="theme-color" content="#0a0a0a" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://thehumantxt.com/" />
  <meta property="og:title" content="The Human TXT · Your words. On-chain. Forever." />
  <meta property="og:description" content="AI is writing more words every day. Trained on yours. 500 characters. Five dollars. One permanent record — on-chain, timestamped, owned by no one." />
  <meta property="og:image" content="https://thehumantxt.com/og-image.png" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://thehumantxt.com/" />
  <meta name="twitter:title" content="The Human TXT · Your words. On-chain. Forever." />
  <meta name="twitter:description" content="AI is writing more words every day. Trained on yours. 500 characters. Five dollars. One permanent record — on-chain, timestamped, owned by no one." />
  <meta name="twitter:image" content="https://thehumantxt.com/og-image.png" />

  <!-- Canonical -->
  <link rel="canonical" href="https://thehumantxt.com/" />

  <!-- Robots -->
  <meta name="robots" content="index, follow" />
</head>
</svelte:head>

{@render children()}

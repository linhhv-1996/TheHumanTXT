export async function load({ fetch }) {
    const res = await fetch('/api/records');
    const dbData = await res.json();
    return {
        dbData
    };
}

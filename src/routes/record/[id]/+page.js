// src/routes/thought/[id]/+page.js
export async function load({ params }) {
    return {
        id: params.id
    };
}

const MY_USER_ID = "75120898";

async function gql(query) {
  const res = await fetch("/api/monday", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data.data;
}

export async function fetchMe() {
  const data = await gql(`query { me { id name title } }`);
  return data.me;
}

export async function fetchBoards() {
  const data = await gql(`
    query {
      boards(limit: 50, order_by: last_activity) {
        id name url state
      }
    }
  `);
  return (data.boards || []).filter((b) => b.state === "active");
}

export async function fetchMyItems(boardId, boardName) {
  const data = await gql(`
    query {
      boards(ids: [${boardId}]) {
        id name
        items_page(limit: 100, query_params: {
          rules: [{ column_id: "person", compare_value: ["${MY_USER_ID}"], operator: any_of }]
        }) {
          items {
            id name url updated_at
            column_values { id text type }
          }
        }
      }
    }
  `);
  const board = data?.boards?.[0];
  if (!board) return [];
  return (board.items_page?.items || []).map((item) => {
    const statusCol = item.column_values?.find((c) => c.type === "color");
    const dateCol = item.column_values?.find((c) => c.type === "date");
    return {
      id: item.id,
      name: item.name,
      url: item.url,
      status: statusCol?.text || null,
      dueDate: dateCol?.text || null,
      boardId: board.id,
      boardTitle: boardName || board.name,
    };
  });
}
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
  const all = [];
  let page = 1;
  while (true) {
    const data = await gql(`
      query {
        boards(limit: 50, page: ${page}, state: active) {
          id name url state workspace { id name }
        }
      }
    `);
    const boards = data.boards || [];
    all.push(...boards);
    if (boards.length < 50) break;
    page++;
  }
  return all;
}

export async function fetchMyItems(boardId, boardName) {
  // Fetch columns + all items together. Filter client-side by people columns
  // to avoid issues with hardcoded column IDs and compare_value formats.
  const data = await gql(`
    query {
      boards(ids: [${boardId}]) {
        id name
        columns { id type }
        items_page(limit: 100) {
          items {
            id name url updated_at
            column_values { id text type value }
            updates(limit: 3) { id text_body created_at creator { name } }
          }
        }
      }
    }
  `);

  const board = data?.boards?.[0];
  if (!board) return [];

  // Find all people-type column IDs for this board
  const peopleColIds = new Set(
    (board.columns || []).filter((c) => c.type === "people").map((c) => c.id)
  );

  return (board.items_page?.items || [])
    .filter((item) =>
      item.column_values?.some((cv) => {
        if (!peopleColIds.has(cv.id)) return false;
        // value is JSON: {"personsAndTeams":[{"id":75120898,"kind":"person"},...]}
        return cv.value?.includes(MY_USER_ID);
      })
    )
    .map((item) => {
      const statusCol = item.column_values?.find(
        (c) => c.type === "color" && !c.id?.toLowerCase().includes("priority")
      );
      const priorityCol = item.column_values?.find(
        (c) => c.type === "color" && c.id?.toLowerCase().includes("priority")
      );
      const dateCol = item.column_values?.find((c) => c.type === "date");
      return {
        id: item.id,
        name: item.name,
        url: item.url,
        updatedAt: item.updated_at,
        status: statusCol?.text || null,
        priority: priorityCol?.text || null,
        dueDate: dateCol?.text || null,
        boardId: board.id,
        boardTitle: boardName || board.name,
        updates: item.updates || [],
      };
    });
}

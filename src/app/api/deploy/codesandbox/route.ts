import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { files } = await req.json();

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: "No files provided" }), { status: 400 });
    }

    const sandboxFiles = files.reduce((acc: any, file: any) => {
      acc[file.path] = {
        content: file.content,
        isBinary: false,
      };
      return acc;
    }, {});

    const response = await fetch("https://codesandbox.io/api/v1/sandboxes/define?json=1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        files: sandboxFiles,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create CodeSandbox");
    }

    const data = await response.json();
    return new Response(JSON.stringify({ sandboxId: data.sandbox_id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CodeSandbox deploy error:", error);
    return new Response(JSON.stringify({ error: "Failed to deploy to CodeSandbox" }), { status: 500 });
  }
}

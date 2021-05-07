import { createProsemirrorPlugin, Node } from '@milkdown/core';
import { NodeSpec, NodeType, Schema, Node as ProsemirrorNode } from 'prosemirror-model';
import { isInTable, tableEditing, TableMap, tableNodes, tableNodeTypes } from 'prosemirror-tables';
import { InputRule } from 'prosemirror-inputrules';
import { Plugin, PluginKey, TextSelection, Selection } from 'prosemirror-state';

export const key = 'MILKDOWN_PLUGIN_TABLE';

const createTable = (schema: Schema, rowsCount = 3, colsCount = 3) => {
    const { cell: tableCell, header_cell: tableHeader, row: tableRow, table } = tableNodeTypes(schema);

    const cells = Array(colsCount)
        .fill(0)
        .map(() => tableCell.createAndFill(null) as ProsemirrorNode);

    const headerCells = Array(colsCount)
        .fill(0)
        .map(() => tableHeader.createAndFill(null) as ProsemirrorNode);

    const rows = Array(rowsCount)
        .fill(0)
        .map((_, i) => tableRow.create(null, i === 0 ? headerCells : cells));

    return table.create(null, rows);
};

const tableNodesSpec = tableNodes({
    tableGroup: 'block',
    cellContent: 'block+',
    cellAttributes: {},
});

class Table extends Node {
    id = 'table';
    schema: NodeSpec = tableNodesSpec.table;
    parser = {
        block: this.id,
    };
    serializer = () => {
        // TODO
    };
    inputRules = (nodeType: NodeType, schema: Schema) => [
        new InputRule(/^\|\|\s$/, (state, _match, start, end) => {
            const $start = state.doc.resolve(start);
            if (!$start.node(-1).canReplaceWith($start.index(-1), $start.indexAfter(-1), nodeType)) return null;

            const tableNode = createTable(schema);
            const tr = state.tr.replaceRangeWith(start, end, tableNode).scrollIntoView();
            return tr.setSelection(TextSelection.create(tr.doc, start));
        }),
    ];
}

class TableRow extends Node {
    id = 'table_row';
    schema: NodeSpec = tableNodesSpec.table_row;
    parser = {
        block: this.id,
    };
    serializer = () => {
        // TODO
    };
}

class TableCell extends Node {
    id = 'table_cell';
    schema: NodeSpec = tableNodesSpec.table_cell;
    parser = {
        block: this.id,
    };
    serializer = () => {
        // TODO
    };
}

class TableHeader extends Node {
    id = 'table_header';
    schema: NodeSpec = tableNodesSpec.table_header;
    parser = {
        block: this.id,
    };
    serializer = () => {
        // TODO
    };
}

const findParentNode = (predicate: (node: ProsemirrorNode) => boolean) => (selection: Selection) => {
    const { $from } = selection;
    for (let i = $from.depth; i > 0; i--) {
        const node = $from.node(i);
        if (predicate(node)) {
            return {
                pos: i > 0 ? $from.before(i) : 0,
                start: $from.start(i),
                depth: i,
                node,
            };
        }
    }
    return undefined;
};

const findTable = (selection: Selection) => findParentNode((node) => node.type.spec.tableRole === 'table')(selection);

export const getCellsInColumn = (columnIndex: number) => (selection: Selection) => {
    const table = findTable(selection);
    if (!table) return undefined;
    const map = TableMap.get(table.node);
    if (columnIndex < 0 || columnIndex >= map.width) {
        return undefined;
    }

    return (
        map
            .cellsInRect({ left: columnIndex, right: columnIndex + 1, top: 0, bottom: map.height })
            // .filter((x) => x)
            .map((pos) => {
                const node = table.node.nodeAt(pos);
                const start = pos + table.start;
                return {
                    pos: start,
                    start: start + 1,
                    node,
                };
            })
    );
};

const plugin = createProsemirrorPlugin(key, () => [
    tableEditing(),
    new Plugin({
        key: new PluginKey('TABLE_OP'),
        props: {
            decorations: (state) => {
                const status = isInTable(state);
                if (!status) return null;
                console.log(getCellsInColumn(0)(state.selection));

                return null;
            },
        },
    }),
]);

export const table = [new Table(), new TableRow(), new TableCell(), new TableHeader(), plugin];

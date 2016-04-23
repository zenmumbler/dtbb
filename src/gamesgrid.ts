// gamesgrid.ts
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { catalog } from "catalog";


interface GameCell {
	tile: HTMLElement;
	thumb: HTMLImageElement;
	title: HTMLElement;
	author: HTMLElement;
	pills: HTMLElement;

	position: number;
	contentIndex: number;
}


export class GamesGrid {
	private rows_ = 0;
	private cols_ = 0;

	private gridOffsetX = 20;
	private gridOffsetY = 20;

	private cellWidth_ = 400;
	private cellHeight_ = 122;
	private cellMargin_ = 16;

	private cellCount_ = 0;
	private activeSet_ = new Set<number>();

	private cells_: GameCell[] = [];
	private entryTemplate_ = <HTMLTemplateElement>document.querySelector("#entry");

	private scrollingElem_: HTMLElement;
	private scrollOffset_ = 0;
	private firstVisibleRow_ = 0;


	constructor(private containerElem_: HTMLElement, private catalog_: catalog.Catalog) {
		this.cellCount_ = catalog_.length;
		for (var x = 0; x < this.cellCount_; ++x) {
			this.activeSet_.add(x);
		}

		this.scrollingElem_ = containerElem_.parentElement;
		this.scrollingElem_.onscroll = (evt: Event) => {
			this.scrollPosChanged((<HTMLElement>evt.target).scrollTop);
		};

		this.resized();
	}


	private makeCell() {
		var tile = <HTMLDivElement>(<Element>this.entryTemplate_.content.cloneNode(true)).firstElementChild;

		var cell: GameCell = {
			tile: <HTMLElement>tile,
			thumb: <HTMLImageElement>tile.querySelector("img"),
			title: <HTMLElement>tile.querySelector("h2"),
			author: <HTMLElement>tile.querySelector("p.author span"),
			pills: <HTMLElement>tile.querySelector(".pills"),
			position: -1,
			contentIndex: -1
		};

		this.containerElem_.appendChild(tile);

		// var featMask = 1;
		// while (featMask <= catalog.EntryFeatures.Source) {
		// 	if (entry.features & featMask) {
		// 		var pill = document.createElement("span");
		// 		pill.className = "pill";
		// 		pill.textContent = featLabel[featMask];
		// 		pills.appendChild(pill);
		// 		filterSets.get(featMask).add(entryIndex);
		// 	}
		// 	featMask <<= 1;
		// }

		return cell;
	}


	private pixelPositionForCellPosition(cellPos: number) {
		var cellRow = Math.floor(cellPos / this.cols_);
		var cellCol = cellPos % this.cols_;
		return {
			left: this.gridOffsetX + (cellCol * (this.cellWidth_ + this.cellMargin_)),
			top: this.gridOffsetY + (cellRow * (this.cellHeight_ + this.cellMargin_))
		};
	}


	private ensureCells(minCells: number) {
		var position = this.cells_.length ? (this.cells_[this.cells_.length - 1].position) : -1;
		while (this.cells_.length < minCells) {
			position += 1;
			var cell = this.makeCell();
			cell.position = position;
			var cellPixelPos = this.pixelPositionForCellPosition(position);
			cell.tile.style.left = cellPixelPos.left + "px";
			cell.tile.style.top = cellPixelPos.top + "px";
			this.cells_.push(cell);
		}
	}


	private moveCells(cellsToMove: GameCell[], positionOffset: number) {
		var crossColumnMove = positionOffset % this.cols_ !== 0;

		for (var c = 0; c < cellsToMove.length; ++c) {
			var cell = cellsToMove[c];
			cell.position += positionOffset;
			var cellPixelPos = this.pixelPositionForCellPosition(cell.position);
			if (crossColumnMove) {
				cell.tile.style.left = cellPixelPos.left + "px";
			}
			cell.tile.style.top = cellPixelPos.top + "px";

			cell.title.textContent = "" + cell.position;
		}
	}


	private moveRowsDown(rowCount: number) {
		var positionOffset = this.cells_.length;
		var cellsToMove = this.cells_.splice(0, rowCount * this.cols_);

		this.moveCells(cellsToMove, positionOffset);

		this.cells_ = this.cells_.concat(cellsToMove);
		this.firstVisibleRow_ += rowCount;
	}


	private moveRowsUp(rowCount: number) {
		var positionOffset = -this.cells_.length;
		var cellsToMove = this.cells_.splice((this.rows_ - rowCount) * this.cols_);

		this.moveCells(cellsToMove, positionOffset);

		this.cells_ = cellsToMove.concat(this.cells_);
		this.firstVisibleRow_ -= rowCount;
	}


	private scrollPosChanged(newScrollPos: number) {
		this.scrollOffset_ = newScrollPos;
		var effectiveOffset = newScrollPos - this.gridOffsetY;
		var effectiveCellHeight = this.cellHeight_ + this.cellMargin_;
		var firstViewRow = Math.floor(effectiveOffset / effectiveCellHeight);
		var rowDiff = Math.abs(firstViewRow - this.firstVisibleRow_);

		if (rowDiff >= this.rows_) {
			this.moveCells(this.cells_, (firstViewRow - this.firstVisibleRow_) * this.cols_);
			this.firstVisibleRow_ = firstViewRow;
		}
		else if (firstViewRow > this.firstVisibleRow_) {
			this.moveRowsDown(rowDiff);
		}
		else if (firstViewRow < this.firstVisibleRow_) {
			this.moveRowsUp(rowDiff);
		}
	}


	private dimensionsChanged(newCols: number, newRows: number) {
		var newScrollOffset = this.scrollingElem_.scrollTop;

		if (this.cols_ != newCols || this.rows_ != newRows) {
			this.cols_ = newCols;
			this.rows_ = newRows;

			this.ensureCells(this.rows_ * this.cols_);
			this.containerElem_.style.height = (this.gridOffsetY * 2) + (Math.ceil(this.cellCount_ / this.cols_) * (this.cellHeight_ + this.cellMargin_)) + "px";
		}
		
		if (newScrollOffset != this.scrollOffset_) {
			this.scrollPosChanged(newScrollOffset);
		}
	}


	resized() {
		var width = this.scrollingElem_.offsetWidth - this.gridOffsetX;
		var height = this.scrollingElem_.offsetHeight - this.gridOffsetY;

		var cols = Math.floor(width / (this.cellWidth_ + this.cellMargin_));
		var rows = Math.ceil(height / (this.cellHeight_ + this.cellMargin_));

		rows += 1;

		this.dimensionsChanged(cols, rows);
	}
}

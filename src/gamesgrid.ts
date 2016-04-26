// gamesgrid.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { catalog } from "catalog";


interface GameCell {
	tile: HTMLElement;
	link: HTMLLinkElement;
	thumb: HTMLDivElement;
	title: HTMLElement;
	author: HTMLElement;
	pills: HTMLElement;

	position: number;
	contentIndex: number;
	hidden: boolean;
}


var featLabel: { [f: number]: string } = {};
featLabel[catalog.EntryFeatures.App] = "Desktop";
featLabel[catalog.EntryFeatures.Win] = "Win";
featLabel[catalog.EntryFeatures.Mac] = "Mac";
featLabel[catalog.EntryFeatures.Linux] = "Linux";
featLabel[catalog.EntryFeatures.Web] = "Web";
featLabel[catalog.EntryFeatures.Java] = "Java";
featLabel[catalog.EntryFeatures.VR] = "VR";
featLabel[catalog.EntryFeatures.Mobile] = "Mobile";


export class GamesGrid {
	private rows_ = 0;
	private cols_ = 0;

	private gridOffsetX = 20;
	private gridOffsetY = 20;

	private cellWidth_ = 392;
	private cellHeight_ = 122;
	private cellMargin_ = 24;

	private entryCount_ = 0;
	private activeList_: number[] = [];

	private cells_: GameCell[] = [];
	private entryTemplate_ = <HTMLTemplateElement>document.querySelector("#entry");

	private scrollingElem_: HTMLElement;
	private scrollOffset_ = 0;
	private firstVisibleRow_ = 0;


	constructor(private containerElem_: HTMLElement, private catalog_: catalog.Catalog) {
		this.entryCount_ = this.catalog_.length;
		for (var x = 0; x < this.entryCount_; ++x) {
			this.activeList_.push(x);
		}

		this.scrollingElem_ = containerElem_.parentElement;
		this.scrollingElem_.onscroll = (evt: Event) => {
			this.scrollPosChanged((<HTMLElement>evt.target).scrollTop);
		};

		this.resized();
	}


	activeSetChanged(newActiveSet: Set<number>) {
		this.entryCount_ = newActiveSet.size;
		this.activeList_ = [];
		newActiveSet.forEach(index => {
			this.activeList_.push(index);
		});

		this.relayout();
	}


	private makeCell() {
		var tile = <HTMLDivElement>(<Element>this.entryTemplate_.content.cloneNode(true)).firstElementChild;

		var cell: GameCell = {
			tile: <HTMLElement>tile,
			link: <HTMLLinkElement>tile.querySelector("a"),
			thumb: <HTMLDivElement>tile.querySelector(".thumb"),
			title: <HTMLElement>tile.querySelector("h2"),
			author: <HTMLElement>tile.querySelector("p.author span"),
			pills: <HTMLElement>tile.querySelector(".pills"),
			position: -1,
			contentIndex: -1,
			hidden: false
		};

		this.containerElem_.appendChild(tile);

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


	private ensureCellCount(cellCount: number) {
		if (cellCount < this.cells_.length) {
			var doomed = this.cells_.splice(cellCount);
			for (var c of doomed) {
				this.containerElem_.removeChild(c.tile);
				c.tile = null;
				c.thumb = null;
				c.title = null;
				c.author = null;
				c.pills = null;

				c.position = -1;
				c.contentIndex = -1;
			}
		}
		else {
			var position = this.cells_.length ? (this.cells_[this.cells_.length - 1].position) : -1;

			while (this.cells_.length < cellCount) {
				position += 1;
				var cell = this.makeCell();
				cell.position = position;
				this.cells_.push(cell);
			}
		}
	}


	private setCellPosition(cell: GameCell, newPosition: number) {
		cell.position = newPosition;
		
		if (newPosition >= this.entryCount_) {
			cell.tile.style.display = "none";
			cell.hidden = true;
			return;
		}
		if (cell.hidden) {
			cell.hidden = false;
			cell.tile.style.display = "";
		}

		var cellPixelPos = this.pixelPositionForCellPosition(newPosition);
		cell.tile.style.left = cellPixelPos.left + "px";
		cell.tile.style.top = cellPixelPos.top + "px";

		var contentIndex = this.activeList_[newPosition];
		if (cell.contentIndex != contentIndex) {
			cell.contentIndex = contentIndex;
			var entry = this.catalog_[contentIndex];

			cell.tile.dataset["eix"] = "" + contentIndex;
			cell.link.href = entry.entry_url;
			cell.link.className = entry.category;
			cell.thumb.style.backgroundImage = "url(" + entry.thumbnail_url + ")";
			cell.title.textContent = entry.title;
			cell.author.textContent = entry.author.name;
			cell.pills.innerHTML = "";

			var featMask = catalog.EntryFeatures.App;
			while (featMask <= catalog.EntryFeatures.Last) {
				if (entry.features & featMask) {
					var pill = document.createElement("span");
					pill.className = "pill";
					pill.textContent = featLabel[featMask];
					cell.pills.appendChild(pill);
				}
				featMask <<= 1;
			}
		}
	}


	private relayout() {
		this.containerElem_.style.height = (this.gridOffsetY * 2) + (Math.ceil(this.entryCount_ / this.cols_) * (this.cellHeight_ + this.cellMargin_)) + "px";

		this.scrollOffset_ = this.scrollingElem_.scrollTop;
		var effectiveOffset = Math.max(0, this.scrollOffset_ - this.gridOffsetY);
		var effectiveCellHeight = this.cellHeight_ + this.cellMargin_;
		var firstViewRow = Math.floor(effectiveOffset / effectiveCellHeight);
		var position = firstViewRow * this.cols_;

		for (var cell of this.cells_) {
			this.setCellPosition(cell, position);
			position += 1;
		}
	}


	private moveCells(cellsToMove: GameCell[], positionOffset: number) {
		for (var c = 0; c < cellsToMove.length; ++c) {
			var cell = cellsToMove[c];
			this.setCellPosition(cell, cell.position + positionOffset);
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
		var effectiveOffset = Math.max(0, this.scrollOffset_ - this.gridOffsetY);
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
		if (this.cols_ != newCols || this.rows_ != newRows) {
			this.cols_ = newCols;
			this.rows_ = newRows;

			this.ensureCellCount(this.rows_ * this.cols_);

			this.relayout();
		}
		else {
			var newScrollOffset = this.scrollingElem_.scrollTop;
			if (newScrollOffset != this.scrollOffset_) {
				this.scrollPosChanged(newScrollOffset);
			}
		}
	}


	resized() {
		var width = this.scrollingElem_.offsetWidth - this.gridOffsetX - 4;
		var height = this.scrollingElem_.offsetHeight - this.gridOffsetY;

		var cols = Math.floor(width / (this.cellWidth_ + this.cellMargin_));
		var rows = Math.ceil(height / (this.cellHeight_ + this.cellMargin_));

		rows += 1;

		this.dimensionsChanged(cols, rows);
	}
}
